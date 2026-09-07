import ActivityKit
import SwiftUI
import WidgetKit

@main
struct RestTimerWidgets: WidgetBundle {
    var body: some Widget { RestTimerActivity() }
}

struct RestTimerActivity: Widget {
    private let ice = Color(red: 187 / 255, green: 225 / 255, blue: 250 / 255)
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestActivityAttributes.self) { context in
            HStack(spacing: 16) {
                Image(systemName: "timer").font(.title).foregroundStyle(ice)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Workout Logger").font(.caption).foregroundStyle(.secondary)
                    Text(context.isStale ? "Rest complete" : "Rest timer").font(.headline)
                }
                Spacer()
                countdown(context.state).font(.system(size: 32, weight: .semibold, design: .rounded))
                    .frame(width: 100, alignment: .trailing)
            }
            .padding(16)
            .activityBackgroundTint(Color(red: 27 / 255, green: 38 / 255, blue: 44 / 255))
            .activitySystemActionForegroundColor(ice)
            .foregroundStyle(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("Rest", systemImage: "timer").foregroundStyle(ice)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    countdown(context.state).font(.title2.bold()).frame(width: 90)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.isStale ? "Rest complete · Ready for your next set" : "Workout Logger")
                        .font(.caption).foregroundStyle(ice)
                }
            } compactLeading: {
                Image(systemName: "timer").foregroundStyle(ice)
            } compactTrailing: {
                countdown(context.state).font(.caption.monospacedDigit()).frame(width: 48)
            } minimal: {
                countdown(context.state).font(.system(size: 10, weight: .semibold).monospacedDigit()).frame(width: 36)
            }
            .keylineTint(ice)
        }
    }

    private func countdown(_ state: RestActivityAttributes.ContentState) -> some View {
        Text(timerInterval: state.startedAt...state.endsAt, countsDown: true, showsHours: false)
            .monospacedDigit()
            .minimumScaleFactor(0.7)
            .lineLimit(1)
    }
}
