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
  
  if (newTrimmedText) {
    if (type === 'add') {
      db[resultList.list] = db[resultList.list].concat(newTrimmedText)
    }
    if (type === 'remove') {
      removedItem = db[resultList.list]
        .find(item => 
          item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]))
      db[resultList.list] = db[resultList.list]
        .filter(item => 
          !item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]))
    }
  }
  return { newDb: db, list: resultList.list, item: newTrimmedText, removedItem }
}

const createListString = (listName, array) => {
  let list = ``
  array.forEach((item, index) => list += (index + 1 + '. ' + item + "\n"))
  return list
}

export const showList = async (bot, chat_id, text, db) => {
  const listName = text[0].toUpperCase() + text.slice(1)
  if (db[text.toLowerCase()]) {
    const list = createListString(listName, db[text.toLowerCase()])
    await bot.sendMessage(chat_id, list || `В списке "${listName}" нет записей.`)
    const options = {
      reply_markup: JSON.stringify({
        keyboard: [
          [{text: 'Добавить запись', callback_data: `Добавить запись `}],
          [{text: 'Удалить запись', callback_data: `Удалить запись `}],
          [{text: 'Списки', callback_data: `/lists`}]
        ]
      })
    };
    await bot.sendMessage(chat_id, `Выберите действие:`, options);
  } else {
    bot.sendMessage(chat_id, `Не найдено списка "${listName}". Пример создания списка: "создать список ..."`)
  }
}

export const showAllLists = (bot, chat_id, db) => {
  const noListsText = 'Нет активных списков. Пример сообщения для добавления списка: "добавить список фильмы".'
  let lists = []
  Object.keys(db).forEach((item) => {
    lists.push([{text: item[0].toUpperCase() + item.slice(1), callback_data: item}])
  })
  const options = {
    reply_markup: JSON.stringify({
      keyboard: lists
    })
  };
  bot.sendMessage(chat_id, `${lists.length ? 'Выберите список:' : noListsText}`, options);
}

export const createNewList = (bot, chat_id, db, db_path, text) => {
  const listName = text.split(' ').splice(2).join(' ').trim()
  if (listName) {
    const dbWithNewList = { ...db, [listName]: [] }
    writeFile(db_path, JSON.stringify(dbWithNewList), (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    });
    bot.sendMessage(chat_id, `Добавлен новый список "${listName}".`)
  }
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
  if (item) {
    await bot.sendMessage(chat_id, `"${item}" добавлено в список ${list}`)
    writeFile(db_path, JSON.stringify(newDb), (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    });
  }
  showList(bot, chat_id, list, newDb)
}

export const removeItem = async (bot, chat_id, db, db_path, text) => {
  const { newDb, list, item, removedItem } = action('remove', db, text)
  if (removedItem) {
    await bot.sendMessage(chat_id, `"${removedItem}" удалено из списка ${list}`)
    writeFile(db_path, JSON.stringify(newDb), (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    });
  }
  showList(bot, chat_id, list, newDb)
}