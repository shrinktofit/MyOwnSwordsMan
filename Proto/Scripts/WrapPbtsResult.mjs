import fs from 'fs-extra';
import { fileURLToPath } from 'url';
const file = fileURLToPath(new URL('../Lib/proto.d.ts', import.meta.url));
(async () => {
    const original = await fs.promises.readFile(file, { encoding: 'utf8' });
    const content = `
    namespace proto {
        ${original}
    }
    export default proto;
    `;
    await fs.promises.writeFile(file, content, { encoding: 'utf-8' });
})();
