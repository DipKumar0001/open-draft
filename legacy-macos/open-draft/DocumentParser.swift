import Foundation
import PDFKit
import UniformTypeIdentifiers

class DocumentParser {
    static func extractText(from url: URL) throws -> String {
        let extensionStr = url.pathExtension.lowercased()
        
        switch extensionStr {
        case "pdf":
            return try extractPDFText(url: url)
        case "docx":
            return try extractDOCXText(url: url)
        case "xlsx":
            return try extractXLSXText(url: url)
        case "txt", "swift", "py", "js", "html", "css", "md", "json", "xml", "csv":
            return try String(contentsOf: url, encoding: .utf8)
        default:
            // Fallback attempt to read as UTF-8 text for any unknown extension
            return (try? String(contentsOf: url, encoding: .utf8)) ?? "Unsupported file format: \(extensionStr)"
        }
    }

    private static func extractPDFText(url: URL) throws -> String {
        guard let pdf = PDFDocument(url: url) else {
            throw NSError(domain: "DocumentParser", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not open PDF"])
        }
        var text = ""
        for i in 0..<pdf.pageCount {
            if let page = pdf.page(at: i) {
                text += (page.string ?? "") + "\n"
            }
        }
        return text
    }
    
    private static func extractDOCXText(url: URL) throws -> String {
        return try runShellCommand(executable: "/usr/bin/unzip", args: ["-p", url.path, "word/document.xml"], stripXML: true)
    }

    private static func extractXLSXText(url: URL) throws -> String {
        return try runShellCommand(executable: "/usr/bin/unzip", args: ["-p", url.path, "xl/sharedStrings.xml"], stripXML: true)
    }

    private static func runShellCommand(executable: String, args: [String], stripXML: Bool) throws -> String {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: executable)
        task.arguments = args
        
        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = Pipe()
        
        try task.run()
        task.waitUntilExit()
        
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        guard let output = String(data: data, encoding: .utf8) else { return "" }
        
        return stripXML ? stripXMLTags(output) : output
    }

    private static func stripXMLTags(_ text: String) -> String {
        let pattern = "<[^>]+>"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else { return text }
        let range = NSRange(location: 0, length: text.utf16.count)
        let intermediate = regex.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: " ")
        return intermediate.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }.joined(separator: " ")
    }
}
