import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { messages, documentContext } = await request.json();

    const systemPrompt = `You are a macOS System Agent running in a web environment. You can read uploaded documents and control the computer via actions.
If you need to perform a system action, you MUST respond ONLY with a JSON object:
{"command": "create_file", "params": {"path": "/path/to/file", "content": "text"}}
{"command": "open_url", "params": {"url": "https://..."}}
{"command": "launch_app", "params": {"appName": "Safari"}}

If you are just explaining or summarizing, respond in natural English.
Document Context check: ${documentContext || 'None'}
`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3', // Note: user's environment assumed to use this model
        messages: fullMessages,
        stream: false
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama returned status ${ollamaResponse.status}`);
    }

    const data = await ollamaResponse.json();
    return NextResponse.json({ message: data.message.content });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
