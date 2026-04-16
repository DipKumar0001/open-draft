import Foundation

enum OllamaError: Error {
    case invalidURL
    case requestFailed
    case decodingError
}

struct OllamaMessage: Codable {
    let role: String
    let content: String
}

struct OllamaChatRequest: Codable {
    let model: String
    let messages: [OllamaMessage]
    let stream: Bool = false
    let format: String?
}

struct OllamaChatResponse: Codable {
    let message: OllamaMessage
}

class OllamaClient {
    static let shared = OllamaClient()
    private let chatURL = URL(string: "http://localhost:11434/api/chat")!

    func generateCompletion(messages: [OllamaMessage], model: String = "llama3", formatJSON: Bool = false) async throws -> String {
        var request = URLRequest(url: chatURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = OllamaChatRequest(model: model, messages: messages, format: formatJSON ? "json" : nil)
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw OllamaError.requestFailed
        }

        let decoded = try JSONDecoder().decode(OllamaChatResponse.self, from: data)
        return decoded.message.content
    }
}
