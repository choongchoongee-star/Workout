import UIKit
import Capacitor

@objc(AppSettingsPlugin)
public class AppSettingsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppSettingsPlugin"
    public let jsName = "AppSettings"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLanguage", returnType: CAPPluginReturnPromise)
    ]

    @objc func getLanguage(_ call: CAPPluginCall) {
        call.resolve(["language": Bundle.main.preferredLocalizations.first ?? "en"])
    }

    @objc func open(_ call: CAPPluginCall) {
        let notifications = call.getBool("notifications") ?? false
        DispatchQueue.main.async {
            let settingsURL: String
            if notifications, #available(iOS 16.0, *) {
                settingsURL = UIApplication.openNotificationSettingsURLString
            } else {
                settingsURL = UIApplication.openSettingsURLString
            }
            guard let url = URL(string: settingsURL) else {
                call.reject("Could not create the iPhone Settings URL.")
                return
            }

            UIApplication.shared.open(url, options: [:]) { opened in
                if opened {
                    call.resolve()
                } else {
                    call.reject("Could not open iPhone Settings.")
                }
            }
        }
    }
}
