import { NextResponse, NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

type SignedDeletionRequest = {
  algorithm?: string;
  user_id?: string;
};

function parseSignedRequest(signedRequest: string, secret: string): SignedDeletionRequest | null {
  const [encodedSig, payload] = signedRequest.split('.', 2);

  if (!encodedSig || !payload) return null;

  try {
    const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const data = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );

    if (typeof data.algorithm !== 'string' || data.algorithm.toUpperCase() !== 'HMAC-SHA256') {
      console.error('Unknown algorithm. Expected HMAC-SHA256');
      return null;
    }

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest();

    if (!crypto.timingSafeEqual(sig, expectedSig)) {
      console.error('Bad Signed JSON signature!');
      return null;
    }

    return data as SignedDeletionRequest;
  } catch (error) {
    console.error('Error parsing signed request', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const signedRequest = formData.get("signed_request");

    if (!signedRequest || typeof signedRequest !== "string") {
      return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
    }

    const appSecret = process.env.META_APP_SECRET;

    if (!appSecret) {
      console.error("META_APP_SECRET is not configured.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const data = parseSignedRequest(signedRequest, appSecret);

    if (!data || !data.user_id) {
      return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 });
    }

    const facebookId = data.user_id;

    // In the new org-centric model, facebookId might correspond to a PlatformConfig's pageId.
    // We delete the matching PlatformConfig. We do NOT delete the Organization or User.
    const configs = await prisma.platformConfig.findMany({
      where: { pageId: facebookId },
      select: { id: true, orgId: true },
    });

    if (configs.length > 0) {
      await prisma.platformConfig.deleteMany({
        where: { id: { in: configs.map(c => c.id) } },
      });
      // Optionally, we could delete messages associated with this platform/org, 
      // but usually just disconnecting the platform is sufficient for the callback unless full data erasure is requested.
    }

    const confirmationCode = `del-${Date.now()}-${facebookId}`;
    
    // The base URL of your application
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://inboxkura.vercel.app";

    // Meta expects a JSON response with a URL to check the status and a confirmation code
    return NextResponse.json({
      url: `${baseUrl}/deletion?status=pending&id=${confirmationCode}`,
      confirmation_code: confirmationCode
    });

  } catch (error) {
    console.error("Data Deletion Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
