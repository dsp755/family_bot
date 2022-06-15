import { writeFile } from 'fs'

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

export const createList = (array) => {
  let list = ''
  array.forEach((item, index) => list += (index + 1 + '. ' + item + "\n"))
  return list
}

export const showList = (bot, chat_id, text, db) => {
  if (db[text.toLowerCase()]) {
    const list = createList(db[text.toLowerCase()])
    if (list.length) {
      bot.sendMessage(chat_id, createList(db[text.toLowerCase()]))
    } else {
      bot.sendMessage(chat_id, `В списке "${text}" нет записей. Пример добавления записи: "добавить ${text} ..."`)
    }
  } else {
    bot.sendMessage(chat_id, `Не найдено списка "${text}". Пример создания списка: "создать список ..."`)
  }
}

export const showAllLists = (bot, chat_id, db) => {
  const noListsText = 'Нет активных списков. Пример сообщения для добавления списка: "добавить список фильмы".'
  let allLists = ''
  Object.keys(db).forEach((item, index) => 
    allLists += (item[0].toUpperCase() + item.slice(1) + ': ' + db[item].length + "\n"))
  bot.sendMessage(chat_id, allLists || noListsText)
}

export const createNewList = (bot, chat_id, db, db_path, text) => {
  const listName = text.split(' ').splice(2).join(' ').trim()
  const dbWithNewList = { ...db, [listName]: [] }
  writeFile(db_path, JSON.stringify(dbWithNewList), (error) => {
    if (error) {
      console.log('An error has occurred ', error);
      return;
    }
  });
  bot.sendMessage(chat_id, `Добавлен новый список "${listName}".`)
}

export const deleteList = (bot, chat_id, db, db_path, text) => {
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
}

export const addItem = async (bot, chat_id, db, db_path, text) => {
  const { newDb, list, item } = action('add', db, text)
  await bot.sendMessage(chat_id, `"${item}" добавлено в список ${list}`)
  writeFile(db_path, JSON.stringify(newDb), (error) => {
    if (error) {
      console.log('An error has occurred ', error);
      return;
    }
  });
  showList(bot, chat_id, list, newDb)
}

export const removeItem = async (bot, chat_id, db, db_path, text) => {
  const { newDb, list, item, removedItem } = action('remove', db, text)
  await bot.sendMessage(chat_id, `"${removedItem}" удалено из списка ${list}`)
  writeFile(db_path, JSON.stringify(newDb), (error) => {
    if (error) {
      console.log('An error has occurred ', error);
      return;
    }
  });
  showList(bot, chat_id, list, newDb)
}