"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePptx = parsePptx;
// @ts-ignore
const officeparser_1 = __importDefault(require("officeparser"));
async function parsePptx(filepath) {
    return new Promise((resolve, reject) => {
        officeparser_1.default.parseOffice(filepath, (data, err) => {
            if (err)
                return reject(err);
            resolve(data);
        });
    });
}
