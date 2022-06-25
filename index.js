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
const dbPath = '../DB/bot_pulling_db'

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
      bot.sendMessage(message.from.id, `Вы вошли под паролем ${message.text.replace('пароль ', '')}`)
      return;
    }

    const chat_id = message.from.id
    const {name, password, lastMessage, language} = await getUser(dbPath, chat_id)
    const db = await getDb(dbPath, password)
    const text = message.text.toLowerCase()
    const userJson = readFileSync(`${dbPath}/users/${chat_id}.json`)
    const user = JSON.parse(userJson)
    const userListsJson = readFileSync(`${dbPath}/lists/${user.password}.json`)
    const userLists = JSON.parse(userListsJson)

    if (db) {
      
      const commands = [
        {command: 'show_lists', description: 'Показать все списки'}
      ]
  
      bot.setMyCommands(commands)
    
      // SHOW ALL LISTS
      if (text.includes('списки') || text.includes('назад к спискам') || text === '/show_lists') {
        showAllLists(bot, message.from.id, userLists)
        return;
      }
    
      // CREATE A NEW LIST
      if (text.includes('добавить список')) {
        await createNewList(bot, chat_id, dbPath, userLists, password, text)
        return;
      }
  
      // DELETE A LIST
      if (text.includes('удалить список')) {
        deleteList(bot, chat_id, dbPath, userLists, password, text)
        return;
      }
  
      // SHOW LIST BY BUTTON CLICK
      if (text.includes('list')) {
        const listName = Object.keys(db)[text.split('')[text.split('').length - 1] - 1]
        showList(bot, chat_id, listName, userLists)
        return;
      }
  
      // SHOW LIST
      if (Object.keys(userLists).includes(text) || text.split(' ').length === 1) {
        showList(bot, chat_id, text, userLists)
        return;
      }
  
      // ADD ITEM TO A LIST
      if (text.includes('добавить')) {    
        addItem(bot, chat_id, password, userLists, dbPath, text)
        return;
      }
  
      // REMOVE ITEM FROM A LIST
      if (text.includes('удалить')) {    
        removeItem(bot, chat_id, password, userLists, dbPath, text)
        return;
      }
    }
  }
});
