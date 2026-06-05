import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getActiveOrg } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { searchParams } = new URL(request.url);
    const mediaUrl = searchParams.get('url');
    if (!mediaUrl) return new Response('Missing url parameter', { status: 400 });

    const activeOrg = await getActiveOrg(user);
    if (!activeOrg) return new Response('No active organization', { status: 400 });

    // Dynamically identify platform from the media URL or find the matching database message to get the exact platform
    let platform: string | undefined = undefined;
    if (mediaUrl.includes('whatsapp') || mediaUrl.includes('fbsbx.com/whatsapp')) {
      platform = 'WA';
    } else {
      const msg = await prisma.message.findFirst({
        where: {
          orgId: activeOrg.orgId,
          OR: [
            { imageUrl: mediaUrl },
            { audioUrl: mediaUrl },
            { videoUrl: mediaUrl }
          ]
        },
        select: { platform: true }
      });
      if (msg) {
        platform = msg.platform;
      }
    }

    // Fetch platform config for the specific platform
    const config = await prisma.platformConfig.findFirst({
      where: {
        orgId: activeOrg.orgId,
        ...(platform ? { platform: platform as any } : {}),
        accessToken: { not: null },
      },
    });

    const headers: Record<string, string> = {};
    const isPrivateMetaUrl = mediaUrl.includes('lookaside.fbsbx.com') || mediaUrl.includes('graph.facebook.com');
    if (config?.accessToken && isPrivateMetaUrl) {
      headers['Authorization'] = `Bearer ${config.accessToken}`;
    }

    console.log(`[Media Proxy] Fetching from ${mediaUrl}... (Private: ${isPrivateMetaUrl})`);
    let res = await fetch(mediaUrl, { headers });

    if (!res.ok && Object.keys(headers).length > 0) {
      console.log(`[Media Proxy] Auth fetch failed with status ${res.status}. Retrying WITHOUT auth headers as fallback...`);
      res = await fetch(mediaUrl);
    }

    if (!res.ok) {
      console.error(`[Media Proxy] Failed to fetch media from ${mediaUrl}. Status: ${res.status}`);
      return new Response(`Failed to fetch media from Meta: ${res.statusText}`, { status: res.status });
    }

    let contentType = res.headers.get('content-type') || '';
    if (contentType.includes(';')) {
      contentType = contentType.split(';')[0].trim();
    }

    const isGeneric = !contentType || contentType === 'application/octet-stream' || contentType === 'octet/stream';
    if (isGeneric) {
      let ext = '';
      try {
        const urlObj = new URL(mediaUrl);
        const pathname = urlObj.pathname;
        ext = pathname.substring(pathname.lastIndexOf('.')).toLowerCase();
      } catch (e) {}

      const isImage = mediaUrl.includes('image') || ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.gif';
      if (isImage) {
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.gif') contentType = 'image/gif';
        else contentType = 'image/jpeg';
      } else {
        // Audio
        if (ext === '.ogg') contentType = 'audio/ogg';
        else if (ext === '.mp3') contentType = 'audio/mp3';
        else if (ext === '.wav') contentType = 'audio/wav';
        else if (ext === '.m4a') contentType = 'audio/m4a';
        else if (ext === '.mp4') contentType = 'audio/mp4';
        else if (ext === '.aac') contentType = 'audio/aac';
        else {
          contentType = (platform === 'WA' || mediaUrl.includes('whatsapp')) ? 'audio/ogg' : 'audio/mp4';
        }
      }
    }

    // Clean up and map standard/unstandard mime types to standard ones for browser compatibility
    const isImageMime = contentType.startsWith('image/');
    if (isImageMime) {
      if (contentType === 'image/jpg') {
        contentType = 'image/jpeg';
      }
    } else {
      if (contentType.startsWith('audio/')) {
        if (contentType === 'audio/x-m4a' || contentType === 'audio/x-mp4') {
          contentType = 'audio/mp4';
        } else if (contentType === 'audio/x-aac') {
          contentType = 'audio/aac';
        } else if (contentType === 'audio/x-wav') {
          contentType = 'audio/wav';
        } else if (contentType === 'audio/x-ogg' || contentType === 'audio/opus') {
          contentType = 'audio/ogg';
        }
      }
    }
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Media Proxy Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
