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
exports.isBotMsg = void 0;
const models_1 = require("../models");
const builtin_1 = require("../builtin");
const bots_1 = require("../controllers/bots");
const SphinxBot = require("sphinx-bot");
const constants_1 = require("../constants");
const logger_1 = require("../utils/logger");
/*
default show or not
restrictions (be able to toggle, or dont show chat)
*/
// return bool whether to skip forwarding to tribe
function isBotMsg(m, sentByMe, sender, forwardedFromContactId) {
    return __awaiter(this, void 0, void 0, function* () {
        const tenant = sender.id;
        if (!tenant) {
            console.log('no tenant in isBotMsg');
            return false;
        }
        const msg = JSON.parse(JSON.stringify(m));
        msg.sender.id = forwardedFromContactId || tenant;
        // console.log('=> isBotMsg', msg)
        const txt = msg.message && msg.message.content;
        const reply_uuid = msg.message && msg.message.replyUuid;
        const msgType = msg.type;
        if (msgType === constants_1.default.message_types.bot_res) {
            return false; // bot res msg type not for processing
        }
        const uuid = msg.chat && msg.chat.uuid;
        if (!uuid)
            return false;
        try {
            const chat = yield models_1.models.Chat.findOne({
                where: { uuid, tenant },
            });
            if (!chat)
                return false;
            let didEmit = false;
            if (txt && txt.startsWith('/bot ')) {
                builtin_1.builtinBotEmit(msg);
                didEmit = true;
            }
            if (didEmit)
                return didEmit;
            // reply back to the bot!
            if (reply_uuid) {
                const ogBotMsg = yield models_1.models.Message.findOne({
                    where: {
                        uuid: reply_uuid,
                        tenant,
                        sender: -1,
                    },
                });
                if (ogBotMsg && ogBotMsg.senderAlias) {
                    const ogSenderBot = yield models_1.models.ChatBot.findOne({
                        where: {
                            chatId: chat.id,
                            tenant,
                            botPrefix: '/' + ogBotMsg.senderAlias,
                        },
                    });
                    return yield emitMessageToBot(msg, ogSenderBot.dataValues, sender);
                }
            }
            const botsInTribe = yield models_1.models.ChatBot.findAll({
                where: {
                    chatId: chat.id,
                    tenant,
                },
            });
            if (logger_1.logging.Network)
                console.log('=> botsInTribe', botsInTribe.length); //, payload)
            if (!(botsInTribe && botsInTribe.length))
                return false;
            yield asyncForEach(botsInTribe, (botInTribe) => __awaiter(this, void 0, void 0, function* () {
                if (botInTribe.msgTypes) {
                    // console.log('=> botInTribe.msgTypes', botInTribe)
                    try {
                        const msgTypes = JSON.parse(botInTribe.msgTypes);
                        if (msgTypes.includes(msgType)) {
                            const isMsgAndHasText = msgType === constants_1.default.message_types.message &&
                                txt &&
                                txt.startsWith(`${botInTribe.botPrefix} `);
                            const isNotMsg = msgType !== constants_1.default.message_types.message;
                            if (isMsgAndHasText || isNotMsg) {
                                didEmit = yield emitMessageToBot(msg, botInTribe.dataValues, sender);
                            }
                        }
                    }
                    catch (e) { }
                }
                else {
                    // no message types defined, do all?
                    if (txt && txt.startsWith(`${botInTribe.botPrefix} `)) {
                        // console.log('=> botInTribe.msgTypes else', botInTribe.dataValues)
                        didEmit = yield emitMessageToBot(msg, botInTribe.dataValues, sender);
                    }
                }
            }));
            return didEmit;
        }
        catch (e) {
            console.log('=> isBotMsg ERROR', e);
            return false;
        }
    });
}
exports.isBotMsg = isBotMsg;
function emitMessageToBot(msg, botInTribe, sender) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log('=> emitMessageToBot',JSON.stringify(msg,null,2))
        if (logger_1.logging.Network)
            console.log('=> emitMessageToBot', msg); //, payload)
        const tenant = sender.id;
        if (!tenant) {
            console.log('=> no tenant in emitMessageToBot');
            return false;
        }
        switch (botInTribe.botType) {
            case constants_1.default.bot_types.builtin:
                builtin_1.builtinBotEmit(msg);
                return true;
            case constants_1.default.bot_types.local:
                const bot = yield models_1.models.Bot.findOne({
                    where: {
                        uuid: botInTribe.botUuid,
                        tenant,
                    },
                });
                return bots_1.postToBotServer(msg, bot, SphinxBot.MSG_TYPE.MESSAGE);
            case constants_1.default.bot_types.remote:
                return bots_1.keysendBotCmd(msg, botInTribe, sender);
            default:
                return false;
        }
    });
}
function asyncForEach(array, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let index = 0; index < array.length; index++) {
            yield callback(array[index], index, array);
        }
    });
}
//# sourceMappingURL=intercept.js.map