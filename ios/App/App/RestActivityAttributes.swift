import ActivityKit
import Foundation

@available(iOS 16.2, *)
struct RestActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        let startedAt: Date
        let endsAt: Date
    }
    let timerID: String
}
