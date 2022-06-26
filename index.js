import telegramBot from "node-telegram-bot-api"
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
import { 
  getUser,
  getDb,
  createPassword,
  saveLastMessage,
  showList, 
  showAllLists, 
  createNewList, 
  deleteList,
  addItemByButton,
  addItemByInput,
  removeItemByButton,
  removeItemByInput
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
      createPassword(dbPath, message)
      bot.sendMessage(message.from.id, `Вы вошли под паролем ${message.text.replace('пароль ', '')}`)
      return;
    }

    
    const chat_id = message.from.id
    const {name, password, language} = await getUser(dbPath, chat_id)
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
      if (Object.keys(userLists).includes(text)) {
        showList(bot, chat_id, text, userLists)
        return;
      }
      console.log(user)

      if (user.lastMessage.includes('добавить запись в список')) {
        addItemByButton(bot, chat_id, user.lastMessage, text, password, userLists, dbPath);
        saveLastMessage(`${dbPath}/users/${chat_id}.json`, user, '')
        return;
      }
      
      // ADD ITEM BY BUTTON
      if (text.includes('добавить запись в список')) {
        const options = {
          reply_markup: JSON.stringify({
            remove_keyboard: true
          })
        };
        bot.sendMessage(chat_id, 'Введите запись', options)
        saveLastMessage(`${dbPath}/users/${chat_id}.json`, user, text)
        return;
      }
  
      // ADD ITEM BY TYPING IN
      if (text.includes('добавить')) {    
        console.log(user.lastMessage)
        addItemByInput(bot, chat_id, password, userLists, dbPath, text)
        saveLastMessage(`${dbPath}/users/${chat_id}.json`, user, text)
        return;
      }


      if (user.lastMessage.includes('удалить запись из списка')) {
        removeItemByButton(bot, chat_id, user.lastMessage, text, password, userLists, dbPath);
        saveLastMessage(`${dbPath}/users/${chat_id}.json`, user, '')
        return;
      }

      // REMOVE ITEM BY BUTTON
      if (text.includes('удалить запись из списка')) {
        const listName = text.replace('удалить запись из списка ', '')
        const options = {
          reply_markup: JSON.stringify({
            keyboard: userLists[listName].map(entry => [{text: entry}])
          })
        };
        bot.sendMessage(chat_id, 'Выберите запись', options)
        saveLastMessage(`${dbPath}/users/${chat_id}.json`, user, text)
        return;
      }
  
      // REMOVE ITEM BY INPUT
      if (text.includes('удалить запись из списка')) {    
        removeItemByInput(bot, chat_id, password, userLists, dbPath, text)
        saveLastMessage(`${dbPath}/users/${chat_id}.json`, user, text)
        return;
      }
    }
  }
});
