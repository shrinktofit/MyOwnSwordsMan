
import proto from '../../Proto/Lib/proto';
import { CharStatus } from './CharStatus.js';

export class Game {
    public move (message: proto.Move) {
        const charStatus = this._getCharacter(message.charId);
        charStatus.move(message.translation);
    }

    private _chars: Map<number, CharStatus> = new Map();

    private _getCharacter (id: number) {
        const charStatus = this._chars.get(id);
        if (!charStatus) {
            throw new Error(`Character not found: ${id}`);
        }
        return charStatus;
    }
}