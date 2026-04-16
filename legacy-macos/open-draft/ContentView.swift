import SwiftUI
import SwiftData

struct ChatMessage: Identifiable {
    let id = UUID()
    let role: String // "user" or "assistant"
    let content: String
}

struct ContentView: View {
    @State private var messages: [ChatMessage] = []
    @State private var inputText: String = ""
    @State private var isProcessing = false
    @State private var currentDocumentContext: String = ""
    
    var body: some View {
        NavigationSplitView {
            List {
                Section("Controls") {
                    Button("Clear History") { messages.removeAll() }
                    Button("Clear Document Context") { currentDocumentContext = "" }
                }
            }
            .navigationTitle("AI Agent")
        } detail: {
            VStack {
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(messages) { msg in
                                ChatBubble(message: msg)
                            }
                        }
                        .padding()
                    }
                }
                
                HStack {
                    Button(action: importDocument) {
                        Image(systemName: "doc.badge.plus")
                    }
                    .padding(.horizontal, 8)
                    
                    TextField("Ask me to fix code, summarize docs, or control your Mac...", text: $inputText)
                        .textFieldStyle(.roundedBorder)
                        .onSubmit { sendMessage() }
                    
                    if isProcessing {
                        ProgressView().controlSize(.small)
                    } else {
                        Button("Send") { sendMessage() }
                        .buttonStyle(.borderedProminent)
                    }
                }
                .padding()
                .background(.ultraThinMaterial)
            }
        }
    }
    
    private func sendMessage() {
        guard !inputText.isEmpty else { return }
        
        let userText = inputText
        messages.append(ChatMessage(role: "user", content: userText))
        inputText = ""
        isProcessing = true
        
        Task {
            await handleAIResponse(userInput: userText)
        }
    }
    
    private func handleAIResponse(userInput: String) async {
        do {
            // 1. Construct the System Prompt for Tool Use
            let systemPrompt = """
            You are a macOS System Agent. You can read documents and control the computer.
            If you need to perform a system action, you MUST respond ONLY with a JSON object:
            {"command": "create_file", "params": {"path": "/path/to/file", "content": "text"}}
            {"command": "open_url", "params": {"url": "https://..."}}
            {"command": "launch_app", "params": {"appName": "Safari"}}
            
            If you are just explaining or summarizing, respond in natural English.
            Document Context: \(currentDocumentContext)
            """
            
            var history = [OllamaMessage(role: "system", content: systemPrompt)]
            history += messages.map { OllamaMessage(role: $0.role, content: $0.content) }
            
            // 2. Get response from Ollama
            let responseText = try await OllamaClient.shared.generateCompletion(messages: history)
            
            // 3. Check if it's a JSON tool call
            if responseText.contains("\"command\"") {
                let result = try parseAndExecute(jsonString: responseText)
                await MainActor.run {
                    messages.append(ChatMessage(role: "assistant", content: "Action triggered: \(result)"))
                }
                // Feed the result back to the AI for a final natural explanation
                await handleAIResponse(userInput: "The tool returned: \(result). Now explain this to the user.")
            } else {
                await MainActor.run {
                    messages.append(ChatMessage(role: "assistant", content: responseText))
                }
            }
        } catch {
            await MainActor.run {
                messages.append(ChatMessage(role: "assistant", content: "Error: \(error.localizedDescription)"))
            }
        }
        
        await MainActor.run { isProcessing = false }
    }
    
    private func parseAndExecute(jsonString: String) throws -> String {
        guard let data = jsonString.data(using: .utf8) else { return "Invalid encoding" }
        let toolCall = try JSONDecoder().decode(ToolCall.self, from: data)
        return AgentToolbox.executeAction(command: toolCall.command, arguments: toolCall.params)
    }
    
    private func importDocument() {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        if panel.runModal() == .OK, let url = panel.url {
            do {
                let text = try DocumentParser.extractText(from: url)
                self.currentDocumentContext = "Content of \(url.lastPathComponent):\n\(text)"
                messages.append(ChatMessage(role: "assistant", content: "Imported \(url.lastPathComponent). I can now analyze it!"))
            } catch {
                messages.append(ChatMessage(role: "assistant", content: "Failed to read doc: \(error.localizedDescription)"))
            }
        }
    }
}

struct ToolCall: Codable {
    let command: String
    let params: [String: String]
}

struct ChatBubble: View {
    let message: ChatMessage
    var body: some View {
        HStack {
            if message.role == "user" { Spacer() }
            Text(message.content)
                .padding()
                .background(message.role == "user" ? Color.blue.opacity(0.2) : Color.gray.opacity(0.1))
                .cornerRadius(10)
                .textSelection(.enabled)
            if message.role == "assistant" { Spacer() }
        }
    }
}
