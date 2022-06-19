import telegramBot from "node-telegram-bot-api"
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
import { 
  getUser,
  getDb,
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
  console.log(message);

  if (message.text) {
    // START
    if (message.text.includes('/start')) {
      bot.sendMessage(message.from.id, `Введите пароль от аккаунта или придумайте новый. Для этого напишите "пароль ...", введя ваш пароль вместо многоточия.`)
      return;
    }
    
    // CREATE PASSWORD
    if (message.text.includes('пароль')) {
      createPassword(message)
      return;
    }

    const chat_id = message.from.id
    const {name, password, last_message, language} = await getUser(chat_id)
    const db = await getDb(password)
    const text = message.text.toLowerCase()

    if (db) {
      
      const commands = [
        {command: 'show_lists', description: 'Показать все списки'}
      ]
  
      bot.setMyCommands(commands)
    
      // SHOW ALL LISTS
      if (text.includes('списки') || text === '/show_lists') {
        showAllLists(bot, message.from.id)
        return;
      }
    
      // CREATE A NEW LIST
      if (text.includes('добавить список')) {
        await createNewList(bot, chat_id, password, text)
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
  }
});

bot.on("callback_query", (data) => {
  // console.log('Callback DATA: ');
  console.log(data);
  // Get the callback data specified
  // let callback_data = data.data
  // bot.answerCallbackQuery(data.id, 'hello'); 
});