import telegramBot from "node-telegram-bot-api"
import { readFileSync, writeFile } from 'fs'
import dotenv from 'dotenv'
import { 
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
const db_path = '../DB/bot_pulling_db/bot_pulling_db.json'

bot.on("message", async (message) => {
  console.log(message)

  if (message.text) {
    const chat_id = message.from.id
    const dbData = readFileSync(db_path)
    const db = JSON.parse(dbData)
    const text = message.text.toLowerCase()

    // SHOW ALL LISTS
    if (text.includes('списки')) {
      showAllLists(bot, chat_id, db)
      return;
    }

    // CREATE A NEW LIST
    if (text.includes('добавить список')) {
      createNewList(bot, chat_id, db, db_path, text)
      return;
    }

    // DELETE A LIST
    if (text.includes('удалить список')) {
      deleteList(bot, chat_id, db, db_path, text)
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
