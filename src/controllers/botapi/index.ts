import * as network from '../../network'
import { models } from '../../models'
import { success, failure } from '../../utils/res'
import constants from '../../constants'
import { getTribeOwnersChatByUUID } from '../../utils/tribes'
import broadcast from './broadcast'
import pay from './pay'

/*
hexdump -n 8 -e '4/4 "%08X" 1 "\n"' /dev/random
hexdump -n 16 -e '4/4 "%08X" 1 "\n"' /dev/random
*/

export interface Action {
  action: string
  chat_uuid: string
  bot_id: string
  bot_name?: string
  amount?: number
  pubkey?: string
  content?: string
  msg_uuid?: string
  reply_uuid?: string
  route_hint?: string
  recipient_id?: number
}

export async function processAction(req, res) {
  console.log('=> processAction', req.body)
  let body = req.body
  if (body.data && typeof body.data === 'string' && body.data[1] === "'") {
    try {
      // parse out body from "data" for github webhook action
      const dataBody = JSON.parse(body.data.replace(/'/g, '"'))
      if (dataBody) body = dataBody
    } catch (e) {
      console.log(e)
      return failure(res, 'failed to parse webhook body json')
    }
  }
  const {
    action,
    bot_id,
    bot_secret,
    pubkey,
    amount,
    content,
    chat_uuid,
    msg_uuid,
    reply_uuid,
    recipient_id,
  } = body

  if (!bot_id) return failure(res, 'no bot_id')
  const bot = await models.Bot.findOne({ where: { id: bot_id } })
  if (!bot) return failure(res, 'no bot')

  if (!(bot.secret && bot.secret === bot_secret)) {
    return failure(res, 'wrong secret')
  }
  if (!action) {
    return failure(res, 'no action')
  }

  const a: Action = {
    bot_id,
    action,
    pubkey: pubkey || '',
    content: content || '',
    amount: amount || 0,
    bot_name: bot.name,
    chat_uuid: chat_uuid || '',
    msg_uuid: msg_uuid || '',
    reply_uuid: reply_uuid || '',
    recipient_id: recipient_id ? parseInt(recipient_id) : 0,
  }

  try {
    const r = await finalAction(a)
    success(res, r)
  } catch (e) {
    failure(res, e)
  }
}

export async function finalAction(a: Action) {
  const {
    bot_id,
    action,
    pubkey,
    route_hint,
    amount,
    content,
    bot_name,
    chat_uuid,
    msg_uuid,
    reply_uuid,
    recipient_id,
  } = a

  let myBot
  // not for tribe admin, for bot maker
  if (bot_id) {
    myBot = await models.Bot.findOne({
      where: {
        id: bot_id,
      },
    })
    if (chat_uuid) {
      const myChat = await getTribeOwnersChatByUUID(chat_uuid)
      // ACTUALLY ITS A LOCAL (FOR MY TRIBE) message! kill myBot
      if (myChat) myBot = null
    }
  }

  // console.log("=> ACTION HIT", a);
  if (myBot) {
    // IM NOT ADMIN - its my bot and i need to forward to admin - there is a chat_uuid
    const owner = await models.Contact.findOne({ where: { id: myBot.tenant } })
    // THIS is a bot member cmd res (i am bot maker)
    const botMember = await models.BotMember.findOne({
      where: {
        tribeUuid: chat_uuid,
        botId: bot_id,
        tenant: owner.id,
      },
    })
    if (!botMember) return console.log('no botMember')

    const dest = botMember.memberPubkey
    if (!dest) return console.log('no dest to send to')
    const topic = `${dest}/${myBot.uuid}`
    const data: network.Msg = {
      action,
      bot_id,
      bot_name,
      type: constants.message_types.bot_res,
      message: {
        content: content || '',
        amount: amount || 0,
        uuid: msg_uuid || '',
      },
      chat: { uuid: chat_uuid || '' },
      sender: {
        pub_key: String(owner.publicKey),
        alias: bot_name || '',
        role: 0,
        route_hint,
      }, // for verify sig
    }
    if (recipient_id) {
      data.recipient_id = recipient_id
    }
    if (reply_uuid) {
      data.message.replyUuid = reply_uuid
    }
    try {
      await network.signAndSend({ dest, data, route_hint }, owner, topic)
    } catch (e) {
      console.log('=> couldnt mqtt publish')
    }
    return // done
  }

  if (action === 'keysend') {
    return console.log('=> BOT KEYSEND to', pubkey)
    // if (!(pubkey && pubkey.length === 66 && amount)) {
    //     throw 'wrong params'
    // }
    // const destkey = pubkey
    // const opts = {
    //     dest: destkey,
    //     data: {},
    //     amt: Math.max((amount || 0), constants.min_sat_amount)
    // }
    // try {
    //     await network.signAndSend(opts, ownerPubkey)
    //     return ({ success: true })
    // } catch (e) {
    //     throw e
    // }
  } else if (action === 'pay') {
    pay(a)
  } else if (action === 'broadcast') {
    broadcast(a)
  } else {
    return console.log('invalid action')
  }
}
