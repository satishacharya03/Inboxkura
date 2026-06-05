import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy_key_for_build' });

export async function analyzeMessageWithGemini(
  text: string,
  context?: string,
  moreOptions: boolean = false,
  contactPersona?: string,
  imageUrl?: string,
  audioUrl?: string,
  orgId?: string,
  platform?: string,
  connectedName?: string,
  orgName?: string,
  knowledgeBase?: Record<string, unknown> | null,
  conversationContext?: string | null
) {
  const contextBlock = context 
    ? `\nHere is the recent conversation history for context:\n<context>\n${context}\n</context>\n` 
    : '';

  const personaBlock = contactPersona
    ? `\nPERSONALIZED CONTACT PERSONA RULES:\nAdopt this specific style/tone/rules for this customer:\n<contact_persona>\n${contactPersona}\n</contact_persona>\n`
    : '';

  // Build knowledge base block from organization's configured info
  let knowledgeBlock = '';
  if (knowledgeBase && typeof knowledgeBase === 'object') {
    const kb = knowledgeBase as Record<string, unknown>;
    const kbParts: string[] = [];
    if (kb.legalName) kbParts.push(`Business Name: ${kb.legalName}`);
    if (kb.tagline) kbParts.push(`Tagline: ${kb.tagline}`);
    if (kb.website) kbParts.push(`Website: ${kb.website}`);
    if (kb.supportEmail) kbParts.push(`Support Email: ${kb.supportEmail}`);
    if (kb.supportPhone) kbParts.push(`Support Phone: ${kb.supportPhone}`);
    if (kb.hours) kbParts.push(`Operating Hours: ${kb.hours}`);
    if (kb.address) kbParts.push(`Address: ${kb.address}`);
    if (kb.about) kbParts.push(`About the Business: ${kb.about}`);
    if (kb.updates) kbParts.push(`Recent Updates: ${kb.updates}`);
    if (kb.faqs && Array.isArray(kb.faqs) && kb.faqs.length > 0) {
      const faqText = kb.faqs.map((f: {q: string, a: string}) => `Q: ${f.q}\nA: ${f.a}`).join('\n');
      kbParts.push(`FAQs:\n${faqText}`);
    }
    if (kbParts.length > 0) {
      knowledgeBlock = `\nBUSINESS KNOWLEDGE BASE (use this as the source of truth when answering customer questions):\n<business_knowledge>\n${kbParts.join('\n')}\n</business_knowledge>\n`;
    }
  }

  // Build conversation memory block from stored rolling context
  const memoryBlock = conversationContext
    ? `\nCONVERSATION MEMORY (summary of the full history with this customer — use this to avoid repetition):\n<conversation_memory>\n${conversationContext}\n</conversation_memory>\n`
    : '';

  const identityBlock = `
    REPRESENTATIVE/BUSINESS IDENTITY RULES:
    - You represent the human representative/owner "${connectedName || 'the representative'}" of the business "${orgName || 'our business'}".
    - You are a human business representative, NOT an AI assistant or chatbot.
    - Talk naturally and professionally on behalf of the business, using first-person pronouns ("I", "We", "ma", "hami", "main", "hum").
    - NEVER refer to yourself as an "AI", "AI assistant", "chatbot", "InboxKura AI", "InboxKura", or "automated system" under any circumstances.
    - **CRITICAL**: If the customer asks for your name (e.g., "What is your name?", "naam k ho?", "k ho name?", "aapka naam kya hai?"), you must state your name as "${connectedName || orgName || 'the representative'}" and never identify yourself as an AI assistant.
  `;

  const prompt = `
    Analyze the following incoming customer message${imageUrl ? ' and the attached photo' : audioUrl ? ' and the attached voice note' : ''}.${knowledgeBlock}${memoryBlock}${contextBlock}${personaBlock}
    ${identityBlock}
    ${moreOptions ? 'NOTE: The agent is requesting alternative/fresh suggestions. Generate a distinct set of replies than before.' : ''}
    Return a strict JSON object with these keys:
    1. "category": must be one of "support", "sales", or "general".
    2. "analysis": a short, concise, and proper one-sentence summary explaining the customer's core intent or emotional state in their detected language/dialect (MAX 15 words).
    3. "suggestedReplies": a JSON array containing EXACTLY 4 distinct, proper drafted response options to the customer. Each reply should be helpful, professional, and vary in tone. Max 2 sentences per reply.
    4. "bestReplyIndex": an integer (0, 1, 2, or 3) representing the index of the single best reply among the 4 suggestedReplies.
    5. "extractedName": the customer's full name if they shared/mentioned it in their messages (e.g., "My name is Priya", "I am Ahmad"), otherwise an empty string "".
    6. "extractedEmail": the customer's email address if they explicitly shared it in the chat, otherwise an empty string "".
    7. "extractedPhone": the customer's phone number if they explicitly shared it in the chat, otherwise an empty string "".
    8. "extractedAddress": the customer's physical or shipping address if they explicitly shared it in the chat, otherwise an empty string "".
    9. "ticketRequested": a boolean (true if the customer is requesting to raise a support ticket, file a complaint, report a bug/issue that needs team tracking, or escalate to a manager/human, false otherwise).
    10. "ticketSubject": a concise subject for the ticket if ticketRequested is true (e.g., "Order #1234 not received"), otherwise "".
    11. "ticketDescription": details of the customer's problem if ticketRequested is true, otherwise "".
    12. "ticketPriority": if ticketRequested is true, one of "Low", "Medium", "High", "Urgent" based on the customer's urgency/sentiment, otherwise "Medium".

    VERY IMPORTANT LANGUAGE REQUIREMENT:
    You must automatically detect the language, dialect, and writing style of the incoming customer message (which could be standard English, Hinglish, Romanized Nepali, Romanized Hindi, or a mix).
    Both the "analysis" summary AND all 4 "suggestedReplies" MUST be generated in the EXACT same language, dialect, script, and writing style that the customer used in their recent message.
    
    Examples of Language Styles:
    - Romanized Nepali: Ke xa, ke grdai ho, timro name ke ho, k chha khabar, khana khayeu, k gardai, k chha, etc.
      If this style is detected, "analysis" and "suggestedReplies" MUST be drafted in natural, fluent Romanized Nepali (e.g. "analysis": "Customer le name ra help ko barema sodhirakha chha.", "suggestedReplies": ["Sanchai chhu, k chha khabar? Hami tapailai k help garna sakchhu?", "Mero naam ${connectedName || 'representative'} ho, tapailai k help chahiyo bhannus na.", "Tapailai k kura sodhna man chha?", "Kura garna thalnu bhayeko ma dhanyabad!"]).
    - Hinglish: Tumara nam kya hee, kya kr rhe ho, mera order kab aayega, batado, kya chal raha hai, etc.
      If this style is detected, "analysis" and "suggestedReplies" MUST be drafted in natural, fluent Hinglish (e.g. "analysis": "Customer name aur delivery ke baare me puch raha hai.", "suggestedReplies": ["Main thik hoon, aap kaise hain? Hum aapki kya help kar sakte hain?", "Mera naam ${connectedName || 'representative'} hai, aapko kya madad chahiye?", "Aapka order hum jaldi check karke batate hain.", "Hamari team aapki help karne ke liye ready hai."]).
    - English: Standard english.
      If the customer wrote in standard English, "analysis" and "suggestedReplies" MUST be drafted in English.

    Never translate to standard English or Devanagari script unless the customer specifically used that script.

    CRITICAL REALISM & LINK RULES:
    1. DO NOT HALLUCINATE OR MAKE FALSE PROMISES: You are a support assistant. If the customer asks you to do something you cannot actually do (like generating custom designs, creating graphics, processing refunds, or performing manual database updates), DO NOT pretend to do it or say it is "ready" or "bharkhar ready bhayo". Instead, politely say that a human team member or designer will review their request and share the updates shortly.
    2. NO PLACEHOLDER LINKS: Never generate placeholder links like "[link]", "example.com", or "[insert link]". If you need to refer to a link, resource, or design but do not have an actual real URL in the context, explicitly state that a team member will send them the link/files as soon as possible.
    3. AVOIDING REPETITION & HANDLING SHORT MESSAGES: If the customer sends a single emoji, a short acknowledgment (e.g., "ok", "hmm", "yes"), or meaningless text (e.g., "auto reply"), DO NOT restate your previous promises or apologize again. Provide a very brief, natural acknowledgment (like "😊" or "Sure!") or ask if they need anything else. If you recently promised an update or apologized in the context, do not keep repeating the exact same promise or apology in subsequent replies. Vary your tone and keep it conversational.
    4. HUMAN HANDOFF: If the customer repeatedly asks to talk to a human, expresses frustration, or uses words like "manxe chainxa", "real person", "support team", you MUST set "ticketRequested" to true. In your suggestedReplies, you MUST draft a final polite message stating: "The conversation has been handed over to our human team. We will be back with you shortly." (Translate this exactly into the customer's native language/dialect like Romanized Nepali or Hinglish). Do not attempt to help them further yourself.

    Message: "${text}"
  `;

  const contents: any[] = [];

  // Parse attached media if available
  if (imageUrl || audioUrl) {
    try {
      let token: string | null = null;
      if (orgId) {
        const { prisma } = await import('./prisma');
        const config = await prisma.platformConfig.findFirst({
          where: {
            orgId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(platform ? { platform: platform as any } : {}),
            accessToken: { not: null },
          },
        });
        token = config?.accessToken || null;
      }

      const mediaUrl = imageUrl || audioUrl;
      if (mediaUrl) {
        const headers: Record<string, string> = {};
        // Only include authorization header for private Meta Graph / lookaside URLs.
        // Public CDN URLs (fbcdn.net, cdninstagram.com) will fail if an Authorization header is supplied.
        const isPrivateMetaUrl = mediaUrl.includes('lookaside.fbsbx.com') || mediaUrl.includes('graph.facebook.com');
        if (token && isPrivateMetaUrl) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        console.log(`[Gemini Media Ingest] Fetching media from ${mediaUrl}... (Private: ${isPrivateMetaUrl})`);
        let mediaRes = await fetch(mediaUrl, { headers });

        if (!mediaRes.ok && Object.keys(headers).length > 0) {
          console.log(`[Gemini Media Ingest] Auth fetch failed with status ${mediaRes.status}. Retrying WITHOUT auth headers as fallback...`);
          mediaRes = await fetch(mediaUrl);
        }

        if (mediaRes.ok) {
          const arrayBuffer = await mediaRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          let mimeType = mediaRes.headers.get('content-type') || '';
          if (mimeType.includes(';')) {
            mimeType = mimeType.split(';')[0].trim();
          }

          // If content-type is missing, generic, or application/octet-stream, resolve it.
          const isGeneric = !mimeType || mimeType === 'application/octet-stream' || mimeType === 'octet/stream';
          if (isGeneric) {
            let ext = '';
            try {
              const urlObj = new URL(mediaUrl);
              const pathname = urlObj.pathname;
              ext = pathname.substring(pathname.lastIndexOf('.')).toLowerCase();
            } catch (e) {
              console.error(`[Gemini Media Ingest] Error parsing URL for extension:`, e);
            }

            if (imageUrl) {
              if (ext === '.png') mimeType = 'image/png';
              else if (ext === '.webp') mimeType = 'image/webp';
              else if (ext === '.gif') mimeType = 'image/gif';
              else mimeType = 'image/jpeg';
            } else {
              // Audio URL
              if (ext === '.ogg') mimeType = 'audio/ogg';
              else if (ext === '.mp3') mimeType = 'audio/mp3';
              else if (ext === '.wav') mimeType = 'audio/wav';
              else if (ext === '.m4a') mimeType = 'audio/m4a';
              else if (ext === '.mp4') mimeType = 'audio/mp4';
              else if (ext === '.aac') mimeType = 'audio/aac';
              else {
                // Default based on platform
                mimeType = (platform === 'WA' || mediaUrl.includes('whatsapp')) ? 'audio/ogg' : 'audio/mp4';
              }
            }
          }

          // Clean up and map standard/unstandard mime types to Gemini-supported ones
          if (imageUrl) {
            if (!mimeType.startsWith('image/')) {
              mimeType = 'image/jpeg';
            } else if (mimeType === 'image/jpg') {
              mimeType = 'image/jpeg';
            }
          } else {
            if (!mimeType.startsWith('audio/')) {
              mimeType = (platform === 'WA' || mediaUrl.includes('whatsapp')) ? 'audio/ogg' : 'audio/mp4';
            } else {
              if (mimeType === 'audio/x-m4a' || mimeType === 'audio/x-mp4') {
                mimeType = 'audio/mp4';
              } else if (mimeType === 'audio/x-aac') {
                mimeType = 'audio/aac';
              } else if (mimeType === 'audio/x-wav') {
                mimeType = 'audio/wav';
              } else if (mimeType === 'audio/x-ogg' || mimeType === 'audio/opus') {
                mimeType = 'audio/ogg';
              }
            }
          }
          
          const base64Data = buffer.toString('base64');
          
          contents.push({
            inlineData: {
              data: base64Data,
              mimeType,
            },
          });
          console.log(`[Gemini Media Ingest] Embedded media successfully. Mime: ${mimeType}, Size: ${buffer.length} bytes`);
        } else {
          console.error(`[Gemini Media Ingest] Failed to fetch media. Status: ${mediaRes.status}`);
        }
      }
    } catch (err) {
      console.error(`[Gemini Media Ingest] Error fetching/embedding media:`, err);
    }
  }

  // Push text prompt as the final part
  contents.push(prompt);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            sentiment: {
              type: "STRING",
              enum: ["positive", "neutral", "negative", "frustrated"],
            },
            category: {
              type: "STRING",
              enum: ["support", "sales", "general"],
            },
            analysis: {
              type: "STRING",
            },
            suggestedReplies: {
              type: "ARRAY",
              items: {
                type: "STRING"
              }
            },
            bestReplyIndex: {
              type: "INTEGER"
            },
            extractedName: {
              type: "STRING"
            },
            extractedEmail: {
              type: "STRING"
            },
            extractedPhone: {
              type: "STRING"
            },
            extractedAddress: {
              type: "STRING"
            },
            ticketRequested: {
              type: "BOOLEAN"
            },
            ticketSubject: {
              type: "STRING"
            },
            ticketDescription: {
              type: "STRING"
            },
            ticketPriority: {
              type: "STRING",
              enum: ["Low", "Medium", "High", "Urgent"]
            }
          },
          required: [
             "category", "analysis", "suggestedReplies", "bestReplyIndex",
            "extractedName", "extractedEmail", "extractedPhone", "extractedAddress",
            "ticketRequested", "ticketSubject", "ticketDescription", "ticketPriority"
          ],
        },
      }
    });

    if (!response.text) return null;
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini AI Analysis Error:", error);
    return null;
  }
}

export async function chatWithGemini(
  prompt: string,
  chatHistory: { role: 'user' | 'model', parts: [{ text: string }] }[],
  context: string,
  olderContext?: string,
  contactPersona?: string,
  connectedName?: string,
  orgName?: string,
  knowledgeBase?: Record<string, unknown> | null,
  conversationContext?: string | null
) {
  let memorySummary = "";
  if (olderContext && olderContext.trim()) {
    try {
      const summaryResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `You are a helper. Summarize the following earlier chat history between an Agent and a Customer in one concise, informative sentence to serve as memory:\n\n${olderContext}`,
      });
      memorySummary = summaryResponse.text?.trim() || "";
    } catch (e) {
      console.error("Error generating memory summary:", e);
    }
  }

  // Prefer stored rolling conversationContext over generated summary
  const memoryBlock = conversationContext
    ? `\nMemory of full conversation history (auto-maintained summary):\n<conversation_memory>\n${conversationContext}\n</conversation_memory>\n`
    : memorySummary 
      ? `\nMemory of earlier conversation:\n<conversation_memory>\n${memorySummary}\n</conversation_memory>\n` 
      : '';

  // Build knowledge base block
  let knowledgeBlock = '';
  if (knowledgeBase && typeof knowledgeBase === 'object') {
    const kb = knowledgeBase as Record<string, unknown>;
    const kbParts: string[] = [];
    if (kb.legalName) kbParts.push(`Business Name: ${kb.legalName}`);
    if (kb.tagline) kbParts.push(`Tagline: ${kb.tagline}`);
    if (kb.website) kbParts.push(`Website: ${kb.website}`);
    if (kb.supportEmail) kbParts.push(`Support Email: ${kb.supportEmail}`);
    if (kb.supportPhone) kbParts.push(`Support Phone: ${kb.supportPhone}`);
    if (kb.hours) kbParts.push(`Operating Hours: ${kb.hours}`);
    if (kb.address) kbParts.push(`Address: ${kb.address}`);
    if (kb.about) kbParts.push(`About the Business: ${kb.about}`);
    if (kb.updates) kbParts.push(`Recent Updates: ${kb.updates}`);
    if (kb.faqs && Array.isArray(kb.faqs) && kb.faqs.length > 0) {
      const faqText = kb.faqs.map((f: {q: string, a: string}) => `Q: ${f.q}\nA: ${f.a}`).join('\n');
      kbParts.push(`FAQs:\n${faqText}`);
    }
    if (kbParts.length > 0) {
      knowledgeBlock = `\nBUSINESS KNOWLEDGE BASE:\n<business_knowledge>\n${kbParts.join('\n')}\n</business_knowledge>\n`;
    }
  }

  const personaBlock = contactPersona
    ? `\nPERSONALIZED CONTACT PERSONA RULES:\nAdopt this specific style/tone/rules for this customer:\n<contact_persona>\n${contactPersona}\n</contact_persona>\n`
    : '';

  const systemInstruction = `
    You are an AI assistant helping a customer support agent.
    The agent is currently dealing with a specific customer chat.
    
    ${knowledgeBlock}
    ${memoryBlock}
    Below is the most recent transcript of that customer chat for context (limited to the latest few messages):
    
    <customer_chat_transcript>
    ${context}
    </customer_chat_transcript>
    
    ${personaBlock}
    
    Answer the agent's questions, analyze the conversation, or draft replies.
    If you suggest a reply that the agent should send to the customer, wrap it in a <reply>...</reply> XML tag.
    Make your suggestions sound professional, empathetic, and concise.

    REPRESENTATIVE/BUSINESS IDENTITY RULES for drafted replies (wrapped in <reply>...</reply>):
    - When drafting replies for the customer, you represent the human representative/owner "${connectedName || 'the representative'}" of the business "${orgName || 'our business'}".
    - The drafted reply must talk naturally as a human on behalf of this business/person, using first-person pronouns ("I", "We", "ma", "hami", "main", "hum").
    - NEVER refer to yourself as an "AI", "AI assistant", "chatbot", "InboxKura AI", "InboxKura", or "automated system" inside the suggested <reply>...</reply> tag under any circumstances.
    - **CRITICAL**: If the customer asks for your name in their messages, you must draft a reply stating your name is "${connectedName || orgName || 'the representative'}", and never identify yourself as an AI assistant.

    VERY IMPORTANT LANGUAGE REQUIREMENT:
    You must natively support and understand English, Hinglish, Romanized Nepali, Romanized Hindi, and mixed dialects.
    Whenever you suggest or draft a reply for the customer (wrapped inside <reply>...</reply> tags), you MUST write it in the EXACT SAME language, dialect, script, and writing style that the customer used in their recent messages in the transcript.
    For example:
    - If the customer sends Romanized Nepali messages like "Ke grdai hoo" or "K chha khabar", the drafted reply MUST also be in Romanized Nepali.
    - If the customer sends Hinglish messages like "Mera delivery kab tak aayega", the drafted reply MUST also be in Hinglish.
    - If they send standard English, the reply MUST be in English.
    Never translate to standard English or Devanagari script unless they wrote in Devanagari script.

    CRITICAL REALISM & LINK RULES:
    1. DO NOT HALLUCINATE OR MAKE FALSE PROMISES: If the customer asks you to perform tasks that you cannot actually do (e.g. generating custom designs, creating logos, processing orders or refunds), DO NOT pretend to do them or say they are "ready". Politely explain that a human agent or designer will take over and assist them shortly.
    2. NO PLACEHOLDER LINKS: Never output placeholder links like "[link]", "example.com", or "[URL]". If no real URL is provided in the conversation context, tell the customer that the team will send them the actual link/files very soon.
    3. AVOIDING REPETITION & HANDLING SHORT MESSAGES: If the customer sends a single emoji, a short acknowledgment (e.g., "ok", "hmm", "yes"), or meaningless text (e.g., "auto reply"), DO NOT restate your previous promises or apologize again. Provide a very brief, natural acknowledgment (like "😊" or "Sure!") or ask if they need anything else. If you recently promised an update or apologized in the context, do not keep repeating the exact same promise or apology in subsequent replies. Vary your tone and keep it conversational.
    4. HUMAN HANDOFF: If the customer repeatedly asks to talk to a human or expresses frustration, draft a final polite message stating: "The conversation has been handed over to our human team. We will be back with you shortly." (Translate this exactly into the customer's native language/dialect like Romanized Nepali or Hinglish). Do not attempt to help them further yourself.
  `;

  try {
    const chat = ai.chats.create({
      model: 'gemini-3.1-flash-lite',
      config: {
        systemInstruction,
      },
      history: chatHistory,
    });
    const response = await chat.sendMessage({ message: prompt });
    return response.text;
  } catch (error) {
    console.error("Gemini AI Chat Error:", error);
    throw error;
  }
}
