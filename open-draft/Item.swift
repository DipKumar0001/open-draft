//
//  Item.swift
//  open-draft
//
//  Created by Dipesh Kumar Yadav on 16/04/2026.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
