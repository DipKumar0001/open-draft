import Foundation
import AppKit

class AgentToolbox {
    /// Executes the command and returns a natural language summary of the outcome
    /// to feed back into the LLM context.
    static func executeAction(command: String, arguments: [String: Any]) -> String {
        switch command {
        case "create_file":
            let path = arguments["path"] as? String ?? "untitled.txt"
            let content = arguments["content"] as? String ?? ""
            
            // Expand tilde if the model provides a path like ~/Desktop/file.txt
            let expandedPath = (path as NSString).expandingTildeInPath
            
            do {
                try content.write(toFile: expandedPath, atomically: true, encoding: .utf8)
                return "Successfully created file at \(expandedPath)."
            } catch {
                return "Failed to create file at \(expandedPath). Error: \(error.localizedDescription)"
            }
            
        case "open_url":
            if let urlString = arguments["url"] as? String, let url = URL(string: urlString) {
                let success = NSWorkspace.shared.open(url)
                return success ? "Successfully opened URL: \(urlString)." : "Failed to open URL: \(urlString)."
            }
            return "Invalid URL provided."
            
        case "launch_app":
            if let appName = arguments["appName"] as? String {
                // Avoid using Process for simple app launching to reduce sandbox crashes
                // NSWorkspace is the preferred Apple API
                let configuration = NSWorkspace.OpenConfiguration()
                NSWorkspace.shared.openApplication(at: nil, configuration: configuration) { (app, error) in
                    // Handling async result of openApplication
                }
                // Since we don't have the URL of the app, we use a shell approach if absolutely necessary
                // but for a "full-fledged" app, it's better to use the 'open' command via Process 
                // while the sandbox is OFF.
                let task = Process()
                task.executableURL = URL(fileURLWithPath: "/usr/bin/open")
                task.arguments = ["-a", appName]
                do {
                    try task.run()
                    return "Successfully requested launch of application: \(appName)."
                } catch {
                    return "Failed to launch application: \(appName). Error: \(error.localizedDescription)"
                }
            }
            return "App name not provided."
            
        default:
            return "Unknown command requested: \(command)."
        }
    }
}
