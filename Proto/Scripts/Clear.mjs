
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

(async () => {
    await fs.emptyDir(fileURLToPath(new URL('../Lib', import.meta.url)));
})();
