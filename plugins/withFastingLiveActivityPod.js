const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const POD_LINE =
  "  pod 'FastingLiveActivity', :path => '../modules/fasting-live-activity/ios'";

/**
 * EAS can skip autolinking local modules. Force the Live Activity pod into the Podfile
 * so ActivityKit start/end is actually compiled into the app.
 */
module.exports = function withFastingLiveActivityPod(config) {
  return withDangerousMod(config, [
    'ios',
    async (mod) => {
      const podfilePath = path.join(mod.modRequest.platformProjectRoot, 'Podfile');
      let contents = await fs.promises.readFile(podfilePath, 'utf8');
      if (!contents.includes("pod 'FastingLiveActivity'")) {
        if (contents.includes('use_expo_modules!')) {
          contents = contents.replace('use_expo_modules!', `use_expo_modules!\n${POD_LINE}`);
        } else {
          contents += `\n${POD_LINE}\n`;
        }
        await fs.promises.writeFile(podfilePath, contents);
      }
      return mod;
    },
  ]);
};
