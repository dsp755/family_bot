import telegramBot from "node-telegram-bot-api"
import { readFileSync, writeFile } from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const TOKEN = process.env.TOKEN;
const bot = new telegramBot(TOKEN, { polling: true });
const db_path = '../DB/bot_pulling_db/bot_pulling_db.json'

const createList = (array) => {
  let list = ''
  array.forEach((item, index) => list += (index + 1 + '. ' + item + "\n"))
  return list
}

const showList = (chat_id, text, db) => {
  const list = createList(db[text.toLowerCase()])
  if (list.length) {
    bot.sendMessage(chat_id, createList(db[text.toLowerCase()]))
  } else {
    bot.sendMessage(chat_id, `В списке "${text}" нет записей.`)
  }
}

const action = (type, db, text) => {
  let trimmedText;
  let removedItem;
  if (type === 'add') {
    trimmedText = text.replace(`добавить `, '')
  }
  if (type === 'remove') {
    trimmedText = text.replace(`удалить `, '')
  }
  const resultList = { list: '', matchLetters: 0 }
  Object.keys(db).forEach(dbList => {
    let matchLetters = 0;
    dbList.split('').forEach(listLetter => {
      trimmedText.split(' ')[0].split('').forEach(textLetter => {
        if (textLetter === listLetter) {
          matchLetters += 1;
        }
      })
    })
    if (matchLetters > resultList.matchLetters) {
      resultList.list = dbList
      resultList.matchLetters = matchLetters
    }
  })
  const newTrimmedText = trimmedText.split(' ').splice(1).join(' ')
  console.log('newTrimmedText: ', newTrimmedText);
  
  if (type === 'add') {
    db[resultList.list] = db[resultList.list].concat(newTrimmedText)
  }
  if (type === 'remove') {
    removedItem = db[resultList.list]
      .find(item => item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]))
    db[resultList.list] = db[resultList.list]
      .filter(item => !item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]))
  }
  return { newDb: db, list: resultList.list, item: newTrimmedText, removedItem }
}

bot.on("message", async (message) => {
  console.log(message)

  if (message.text) {
    const chat_id = message.from.id
    const dbData = readFileSync(db_path)
    const db = JSON.parse(dbData)
    const text = message.text.toLowerCase()

    // SHOW ALL LISTS
    if (text.includes('списки')) {
      const noLists = 'Нет активных списков. Пример сообщения для добавления списка: "добавить список фильмы".'
      bot.sendMessage(chat_id, createList(Object.keys(db)) || noLists)
      return;
    }

    // CREATE A NEW LIST
    if (text.includes('добавить список')) {
      const listName = text.split(' ').splice(2).join(' ').trim()
      const dbWithNewList = { ...db, [listName]: [] }
      writeFile(db_path, JSON.stringify(dbWithNewList), (error) => {
        if (error) {
          console.log('An error has occurred ', error);
          return;
        }
      });
      bot.sendMessage(chat_id, `Добавлен новый список "${listName}".`)
      return;
    }

    // DELETE A LIST
    if (text.includes('удалить список')) {
      const listName = text.split(' ').splice(2).join(' ').trim()
      if (!Object.keys(db).includes(listName)) {
        bot.sendMessage(chat_id, `Список "${listName}" не найден.`)
        return;
      }
      const dbCopy = { ...db }
      delete dbCopy[listName]
      writeFile(db_path, JSON.stringify(dbCopy), (error) => {
        if (error) {
          console.log('An error has occurred ', error);
          return;
        }
      });
      bot.sendMessage(chat_id, `Список "${listName}" удален.`)
      return;
    }

    // SHOW LIST
    // If message text is one word
    if (text.split(' ').length === 1) {
      showList(chat_id, text, db)
    }

    // ADD ITEM TO A LIST
    if (text.includes('добавить')) {    
      const { newDb, list, item } = action('add', db, text)
      await bot.sendMessage(chat_id, `"${item}" добавлено в список ${list}`)
      writeFile(db_path, JSON.stringify(newDb), (error) => {
        if (error) {
          console.log('An error has occurred ', error);
          return;
        }
      });
      showList(chat_id, list, newDb)
    }

    // REMOVE ITEM FROM A LIST
    if (text.includes('удалить')) {    
      const { newDb, list, item, removedItem } = action('remove', db, text)
      await bot.sendMessage(chat_id, `"${removedItem}" удалено из списка ${list}`)
      writeFile(db_path, JSON.stringify(newDb), (error) => {
        if (error) {
          console.log('An error has occurred ', error);
          return;
        }
      });
      showList(chat_id, list, newDb)
    }
  }
});
