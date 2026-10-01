import ActivityKit
import Foundation
import AppIntents
import UserNotifications

@available(iOS 16.2, *)
struct RestActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        let startedAt: Date
        let endsAt: Date
    }
    let timerID: String
    let language: String?
    let notificationID: Int?
}

// LiveActivityIntent runs in the host app process, including while the UI is closed.
@available(iOS 17.0, *)
struct CancelRestTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Cancel rest timer"
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Timer ID") var timerID: String
    @Parameter(title: "Notification ID") var notificationID: Int

    init() {}
    init(timerID: String, notificationID: Int) {
        self.timerID = timerID
        self.notificationID = notificationID
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        guard !timerID.isEmpty, notificationID > 0 else { return .result() }
        UserDefaults.standard.set(timerID, forKey: "cancelledRestTimerID")
        let center = UNUserNotificationCenter.current()
        let identifiers = [String(notificationID)]
        center.removePendingNotificationRequests(withIdentifiers: identifiers)
        center.removeDeliveredNotifications(withIdentifiers: identifiers)
        NotificationCenter.default.post(name: Notification.Name("restTimerCancelled"), object: timerID)
        for activity in Activity<RestActivityAttributes>.activities where activity.attributes.timerID == timerID {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        return .result()
    }
}
