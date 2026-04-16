'use client';
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentContext, setDocumentContext] = useState('');
  const [documentName, setDocumentName] = useState('');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setDocumentName(file.name);
    setMessages(prev => [...prev, { role: 'assistant', content: `Importing \${file.name}...` }]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setDocumentContext(`Content of \${file.name}:\\n\${data.text}`);
      setMessages(prev => [...prev, { role: 'assistant', content: `Successfully mapped \${file.name} to memory! I can now analyze it.` }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', content: `Error parsing document: \${err.message}` }]);
    }
  };

  const handleAIMessage = async (userMessage) => {
    setIsProcessing(true);
    let currentHistory = [...messages, { role: 'user', content: userMessage }];
    setMessages(currentHistory);

    try {
      let isToolCall = true;
      let iterations = 0;

      while (isToolCall && iterations < 3) {
        iterations++;
        const aiResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: currentHistory.map(m => ({ role: m.role, content: m.content })),
            documentContext
          })
        });

        const aiData = await aiResponse.json();
        if (!aiResponse.ok) throw new Error(aiData.error);
        
        let replyContent = aiData.message;

        if (replyContent.includes('"command"')) {
          try {
            // Very naive JSON extraction from the text block in case the LLM wrapped it in markdown
            const jsonStr = replyContent.substring(replyContent.indexOf('{'), replyContent.lastIndexOf('}') + 1);
            const toolCall = JSON.parse(jsonStr);
            
            setMessages(prev => [...prev, { role: 'assistant', content: `Executing action: \${toolCall.command}...` }]);
            
            const toolResponse = await fetch('/api/tools', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(toolCall)
            });
            const toolData = await toolResponse.json();
            const resultMsg = toolResponse.ok ? toolData.result : `Failed: \${toolData.error}`;

            setMessages(prev => [...prev, { role: 'assistant', content: `Action Response: \${resultMsg}` }]);
            
            // Re-feed result to history to loop back
            currentHistory.push(
              { role: 'assistant', content: replyContent },
              { role: 'system', content: `The tool returned: \${resultMsg}. Acknowledge this briefly to the user.` }
            );

          } catch (toolParseErr) {
            setMessages(prev => [...prev, { role: 'system', content: `Failed to parse tool call: \${toolParseErr.message}` }]);
            isToolCall = false;
          }
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: replyContent }]);
          isToolCall = false;
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', content: `Error checking API: \${err.message}` }]);
    }

    setIsProcessing(false);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const txt = inputText;
    setInputText('');
    handleAIMessage(txt);
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2>Antigravity Agent</h2>
        
        <button className="control-btn" onClick={() => setMessages([])}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          Clear History
        </button>
        <button className="control-btn" onClick={() => { setDocumentContext(''); setDocumentName(''); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>
          Clear Context
        </button>

        {documentContext && (
          <div className="doc-context">
            <strong>Active Document Context:</strong><br/>
            {documentName} loaded in memory.
          </div>
        )}
      </aside>

      <main className="main-chat">
        <div className="chat-history">
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" style={{marginBottom: '16px'}}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <h3>Welcome to the Web Agent</h3>
              <p>Upload a document or type a command to get started.</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper \${msg.role}`}>
              <div className={`message \${msg.role}`}>
                <div className="message-content">{msg.content}</div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="input-area">
          <label className="upload-label" title="Upload Document">
            <input type="file" style={{ display: 'none' }} accept=".pdf,.docx,.xlsx,.txt,.csv" onChange={handleFileUpload} />
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
            </svg>
          </label>
          <input 
            type="text" 
            className="chat-input"
            placeholder="Ask me to fix code, summarize docs, or control your Mac..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isProcessing}
          />
          <button className="send-btn" onClick={handleSend} disabled={isProcessing || !inputText.trim()}>
            {isProcessing ? <div className="spinner"></div> : 'Send'}
          </button>
        </div>
      </main>
    </div>
  );
}
