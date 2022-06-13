import telegramBot from "node-telegram-bot-api"
import { readFileSync, writeFile } from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const TOKEN = process.env.TOKEN;
const bot = new telegramBot(TOKEN, { polling: true });
const db_path = './db.json'

const categories = {
  'дела': 'tasks',
  'продукты': 'food',
  'фильмы': 'movies'
}

const createList = (array) => {
  let list = ''
  array.forEach((item, index) => list += (index + 1 + '. ' + item + "\n"))
  return list
}

const showCategory = (chat_id, text, db) => {
  const list = createList(db[categories[text.toLowerCase()]])
  if (list.length) {
    bot.sendMessage(chat_id, createList(db[categories[text.toLowerCase()]]))
  } else {
    bot.sendMessage(chat_id, `В категории "${text}" нет записей.`)
  }
}

const modifiedData = (type, db, text) => {
  let trimmedText;
  let removedItem;
  if (type === 'add') {
    trimmedText = text.replace(`добавить `, '')
  }
  if (type === 'remove') {
    trimmedText = text.replace(`удалить `, '')
  }
  const resultCategory = { category: '', matchLetters: 0 }
  Object.keys(categories).forEach(category => {
    let matchLetters = 0;
    category.split('').forEach(catLetter => {
      trimmedText.split('').forEach(textLetter => {
        if (textLetter === catLetter) {
          matchLetters += 1;
        }
      })
    })
    if (matchLetters > resultCategory.matchLetters) {
      resultCategory.category = category
      resultCategory.matchLetters = matchLetters
    }
  })
  const rusCategory = resultCategory.category
  const newTrimmedText = trimmedText.split(' ').splice(1).join(' ')
  console.log('newTrimmedText: ', newTrimmedText);
  
  if (type === 'add') {
    db[categories[rusCategory]] = db[categories[rusCategory]].concat(newTrimmedText)
  }
  if (type === 'remove') {
    removedItem = db[categories[rusCategory]]
      .find(item => item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]))
    db[categories[rusCategory]] = db[categories[rusCategory]]
      .filter(item => !item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]))
  }
  return { newDb: db, category: rusCategory, item: newTrimmedText, removedItem }
}

bot.on("message", async (message) => {
  console.log(message)

  if (message.text) {
    const chat_id = message.from.id
    const dbData = readFileSync(db_path)
    const db = JSON.parse(dbData)
    const text = message.text.toLowerCase()

    // SHOW LIST
    // If message text is one word
    if (text.split(' ').length === 1) {
      showCategory(chat_id, text, db)
    }

    // ADD ITEM TO A LIST
    if (text.includes('добавить')) {    
      const { newDb, category, item } = modifiedData('add', db, text)
      await bot.sendMessage(chat_id, `"${item}" добавлено в категорию ${category}`)
      writeFile(db_path, JSON.stringify(newDb), (error) => {
        if (error) {
          console.log('An error has occurred ', error);
          return;
        }
      });
      showCategory(chat_id, category, newDb)
    }

    // REMOVE ITEM FROM A LIST
    if (text.includes('удалить')) {    
      const { newDb, category, item, removedItem } = modifiedData('remove', db, text)
      await bot.sendMessage(chat_id, `"${removedItem}" удалено из категории ${category}`)
      writeFile(db_path, JSON.stringify(newDb), (error) => {
        if (error) {
          console.log('An error has occurred ', error);
          return;
        }
      });
      showCategory(chat_id, category, newDb)
    }
  }
});
