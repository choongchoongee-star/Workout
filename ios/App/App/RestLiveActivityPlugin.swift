import ActivityKit
import Capacitor
import UIKit

@objc(RestLiveActivityPlugin)
public class RestLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RestLiveActivityPlugin"
    public let jsName = "RestLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise)
    ]

    @objc func start(_ call: CAPPluginCall) { dispatch("start", call) }
    @objc func end(_ call: CAPPluginCall) { dispatch("end", call) }
    @objc func getState(_ call: CAPPluginCall) { dispatch("getState", call) }

    private func dispatch(_ operation: String, _ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard #available(iOS 16.2, *) else {
                call.resolve(["status": "unsupported"])
                return
            }
            RestActivityManager.shared.enqueue(operation, call)
        }
    }
}

@available(iOS 16.2, *)
@MainActor
private final class RestActivityManager {
    static let shared = RestActivityManager()
    private var pending: Task<Void, Never>?
    private var expiry: Task<Void, Never>?

    // Serialize native operations too: a late end cannot race a newer start.
    func enqueue(_ operation: String, _ call: CAPPluginCall) {
        let previous = pending
        pending = Task { @MainActor in
            await previous?.value
            switch operation {
            case "start": await start(call)
            case "end":
                let timerID = call.getString("timerID")
                for activity in Activity<RestActivityAttributes>.activities where timerID == nil || activity.attributes.timerID == timerID {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
                call.resolve(["status": "ended"])
            default: await restore(call)
            }
        }
    }

    private func start(_ call: CAPPluginCall) async {
        guard let timerID = call.getString("timerID"),
              let startMS = call.getDouble("startedAt"), let endMS = call.getDouble("endsAt"),
              startMS.isFinite, endMS.isFinite, endMS > startMS, endMS - startMS <= 28_800_000,
              endMS > Date().timeIntervalSince1970 * 1000 else {
            call.resolve(["status": "invalid"])
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["status": "disabled"])
            return
        }
        guard UIApplication.shared.applicationState == .active else {
            call.resolve(["status": "background"])
            return
        }
        expiry?.cancel()
        for activity in Activity<RestActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        do {
            let state = RestActivityAttributes.ContentState(
                startedAt: Date(timeIntervalSince1970: startMS / 1000),
                endsAt: Date(timeIntervalSince1970: endMS / 1000))
            let activity = try Activity.request(attributes: RestActivityAttributes(timerID: timerID, language: Bundle.main.preferredLocalizations.first ?? "en"),
                content: ActivityContent(state: state, staleDate: state.endsAt), pushType: nil)
            scheduleExpiry(activity)
            call.resolve(["status": "active", "timerID": timerID])
        } catch {
            call.resolve(["status": "unavailable"])
        }
    }

    private func restore(_ call: CAPPluginCall) async {
        let activities = Activity<RestActivityAttributes>.activities.sorted { $0.content.state.endsAt > $1.content.state.endsAt }
        var current: Activity<RestActivityAttributes>?
        for activity in activities {
            if activity.content.state.endsAt <= Date() || current != nil {
                await activity.end(nil, dismissalPolicy: .immediate)
            } else { current = activity }
        }
        guard let activity = current else {
            call.resolve(["status": ActivityAuthorizationInfo().areActivitiesEnabled ? "idle" : "disabled"])
            return
        }
        scheduleExpiry(activity)
        call.resolve(["status": "active", "timerID": activity.attributes.timerID,
            "startedAt": activity.content.state.startedAt.timeIntervalSince1970 * 1000,
            "endsAt": activity.content.state.endsAt.timeIntervalSince1970 * 1000])
    }

    private func scheduleExpiry(_ activity: Activity<RestActivityAttributes>) {
        expiry?.cancel()
        let delay = max(0, activity.content.state.endsAt.timeIntervalSinceNow)
        expiry = Task { @MainActor in
            do { try await Task.sleep(nanoseconds: UInt64(min(delay, 28800) * 1_000_000_000)) }
            catch { return }
            guard !Task.isCancelled else { return }
            // Best effort while the host runs; the widget itself clamps its timer at zero.
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
