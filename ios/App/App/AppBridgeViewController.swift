import Capacitor

class AppBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppSettingsPlugin())
        bridge?.registerPluginInstance(RestLiveActivityPlugin())
    }
}
