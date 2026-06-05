export async function sendTelegramMessage(
  chatId: string,
  text: string,
  businessConnectionId?: string
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined');
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload: {
    chat_id: string;
    text: string;
    business_connection_id?: string;
  } = {
    chat_id: chatId,
    text: text,
  };

  if (businessConnectionId) {
    payload.business_connection_id = businessConnectionId;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Telegram API error:', errorData);
    throw new Error(`Telegram API error: ${errorData.description || response.statusText}`);
  }

  return await response.json();
}
