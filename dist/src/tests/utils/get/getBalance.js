"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalance = void 0;
const http = require("ava-http");
const helpers_1 = require("../helpers");
const getBalance = (t, node) => __awaiter(void 0, void 0, void 0, function* () {
    //GET BALANCE OF NODE ===>
    const r = yield http.get(node.external_ip + '/balance', helpers_1.makeArgs(node));
    t.true(r.success, 'should get node balance');
    const nodeBalance = r.response.balance;
    return nodeBalance;
});
exports.getBalance = getBalance;
//# sourceMappingURL=getBalance.js.map