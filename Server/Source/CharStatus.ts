import { Vec3 } from "./Math/Vec3.js";


export class CharStatus {
    public move (translation: Readonly<Vec3>) {
        Vec3.add(this._position, translation, this._position);
    }

    private _position = new Vec3();
}
