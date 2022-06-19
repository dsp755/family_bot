import telegramBot from "node-telegram-bot-api"
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
import { 
  createPassword,
  showList, 
  showAllLists, 
  createNewList, 
  deleteList,
  addItem,
  removeItem
} from './functions.js'

dotenv.config()

const TOKEN = process.env.TOKEN;
const bot = new telegramBot(TOKEN, { polling: true });
const db_path = '../DB/bot_pulling_db'

bot.on("message", async (message) => {
  console.log(message)

  if (message.text) {
    const chat_id = message.from.id
    // const user = readFileSync(db_path + `/users/${chat_id}.json`, (error) => console.log(error))
    // const dbData = readFileSync(db_path + `/lists/${user.password}.json`, (error) => console.log(error))
    // const db = JSON.parse(dbData)
    const text = message.text.toLowerCase()

    const commands = [
      {command: 'show_lists', description: 'Показать все списки'}
    ]

    bot.setMyCommands(commands)

    // START
    if (text.includes('/start')) {
      bot.sendMessage(chat_id, `Введите пароль от аккаунта или придумайте новый. Для этого напишите "пароль ...", введя ваш пароль вместо многоточия.`)
      return;
    }

    // CREATE PASSWORD
    if (text.includes('пароль')) {
      createPassword(message)
      return;
    }
  
    // SHOW ALL LISTS
    if (text.includes('списки') || text === '/show_lists') {
      showAllLists(bot, message.from.id)
      return;
    }
  
    // CREATE A NEW LIST
    if (text.includes('добавить список')) {
      createNewList(bot, message.from.id, text)
      return;
    }

    // DELETE A LIST
    if (text.includes('удалить список')) {
      deleteList(bot, chat_id, db, db_path, text)
      return;
    }

    // SHOW LIST BY BUTTON CLICK
    if (text.includes('list')) {
      const listName = Object.keys(db)[text.split('')[text.split('').length - 1] - 1]
      showList(bot, chat_id, listName, db)
      return;
    }

    // SHOW LIST
    // If message text is one word
    if (text.split(' ').length === 1) {
      showList(bot, chat_id, text, db)
      return;
    }

    // ADD ITEM TO A LIST
    if (text.includes('добавить')) {    
      addItem(bot, chat_id, db, db_path, text)
      return;
    }

    // REMOVE ITEM FROM A LIST
    if (text.includes('удалить')) {    
      removeItem(bot, chat_id, db, db_path, text)
      return;
    }
  }
});

bot.on("callback_query", (data) => {
  // console.log('Callback DATA: ');
  console.log(data);
  // Get the callback data specified
  // let callback_data = data.data
  // bot.answerCallbackQuery(data.id, 'hello'); 
});