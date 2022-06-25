import { writeFile, readFileSync, promises } from 'fs'

export const getUser = async (dbPath, chat_id) => {
  let user;
  const getUserData = () => promises.readFile(`${dbPath}/users/${chat_id}.json`, 'utf-8')
    .then(data => JSON.parse(data))
    .then(data => { user = data })
  await getUserData();
  return user;
}

export const getDb = async (dbPath, password) => {
  let db;
  const getDbData = () => promises.readFile(`${dbPath}/lists/${password}.json`, 'utf-8')
  .then(data => JSON.parse(data))
  .then(data => { db = data })
  await getDbData();
  return db;
}

export const createPassword = (dbPath, message) => {
  const listName = message.text.toLowerCase().split(' ').slice(1).join().trim()
  try {
    // CREATE USER
    writeFile(
      `${dbPath}/users/${message.from.id}.json`, 
      JSON.stringify({ 
      name: message.from.first_name + ' ' + message.from.last_name,
      language: message.from.language_code,
      password: listName,
      lastMessage: message.text
    }),
    (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    }
  );
    // CHECK IF A DATABASE FOR THE PASSWORD EXISTS
    readFileSync(`${dbPath}/lists/${listName}.json`)
  } catch(err) {
    // CREATE NEW DATABASE WITH THE PASSWORD AS A NAME
    writeFile(
      `${dbPath}/lists/${listName}.json`, 
      JSON.stringify({}),
      (error) => {
        if (error) {
          console.log('An error has occurred ', error);
          return;
        }
      }
    )
  } 
}

export const saveLastMessage = (path, user, text) => {
  user.lastMessage = text
  writeFile(
    path, 
    JSON.stringify(user),
    (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    }
  )
}

const action = (type, userLists, text) => {
  let trimmedText;
  let removedItem;
  if (type === 'add') {
    trimmedText = text.replace(`добавить `, '')
  }
  if (type === 'remove') {
    trimmedText = text.replace(`удалить `, '')
  }
  const resultList = { list: '', matchLetters: 0 }
  Object.keys(userLists).forEach(list => {
    let matchLetters = 0;
    list.split('').forEach(listLetter => {
      trimmedText.split(' ')[0].split('').forEach(textLetter => {
        if (textLetter === listLetter) {
          matchLetters += 1;
        }
      })
    })
    if (matchLetters > resultList.matchLetters) {
      resultList.list = list
      resultList.matchLetters = matchLetters
    }
  })
  const newTrimmedText = trimmedText.split(' ').splice(1).join(' ')
  console.log('newTrimmedText: ', newTrimmedText);
  
  if (newTrimmedText) {
    if (type === 'add' && userLists[resultList.list]) {
      userLists[resultList.list] = userLists[resultList.list].concat(newTrimmedText)
    }
    if (type === 'remove') {
      removedItem = userLists[resultList.list]
        .find(item => 
          item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]));
          userLists[resultList.list] = userLists[resultList.list]
        .filter(item => 
          !item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]))
    }
  }
  return { newDb: userLists, list: resultList.list, item: newTrimmedText, removedItem }
}

const createListString = (array) => {
  let list = ``
  array.forEach((item, index) => list += (index + 1 + '. ' + item + "\n"))
  return list
}

export const showList = async (bot, chat_id, text, userLists) => {
  const listName = text[0].toUpperCase() + text.slice(1)
  if (userLists[text.toLowerCase()]) {
    const list = createListString(userLists[text.toLowerCase()])
    const options = {
      reply_markup: JSON.stringify({
        keyboard: [
          [{text: `Добавить запись в список ${listName}`}],
          [{text: `Удалить запись из списка ${listName}`}],
          [{text: 'Назад к спискам'}]
        ]
      })
    };
    await bot.sendMessage(chat_id, list || `В списке "${listName}" нет записей.`, options)
  } else {
    bot.sendMessage(chat_id, `Не найдено списка "${listName}". Пример создания списка: "создать список ..."`)
  }
}

export const showAllLists = (bot, chat_id, userLists) => {
  const noListsText = 'Нет активных списков. Пример сообщения для добавления списка: "добавить список фильмы".'
  try {
    const lists = [];
    Object.keys(userLists).forEach((item) => {
      lists.push([{text: item[0].toUpperCase() + item.slice(1), callback_data: item}])
    })
    const options = {
      reply_markup: JSON.stringify({
        keyboard: lists
      })
    };
    bot.sendMessage(chat_id, 'Выберите список', options);
  } catch(err) {
    bot.sendMessage(chat_id, noListsText);
  }
}

export const createNewList = async (bot, chat_id, dbPath, userLists, password, text) => {
  const listName = text.split(' ').splice(2).join(' ').trim()
  if (listName) {
    try {
      const updatedLists = { ...userLists, [listName]: [] }
      const addList = async () => {
        promises.writeFile(`${dbPath}/lists/${password}.json`, JSON.stringify(updatedLists));
      }
      await addList();
      bot.sendMessage(chat_id, `Добавлен новый список "${listName}".`)
    } catch(err) {
      bot.sendMessage(chat_id, `Ошибка создания списка.`)
    }
  }
}

export const deleteList = (bot, chat_id, dbPath, userLists, password, text) => {
  const listName = text.split(' ').splice(2).join(' ').trim()
  if (!Object.keys(userLists).includes(listName)) {
    bot.sendMessage(chat_id, `Список "${listName}" не найден.`)
    return;
  }
  const userListsCopy = { ...userLists }
  delete userListsCopy[listName]
  writeFile(`${dbPath}/lists/${password}.json`, JSON.stringify(userListsCopy), (error) => {
    if (error) {
      console.log('An error has occurred ', error);
      return;
    }
  });
  bot.sendMessage(chat_id, `Список "${listName}" удален.`)
}

export const addItem = async (bot, chat_id, password, userLists, dbPath, text) => {
  const { newDb, list, item } = action('add', userLists, text)
  if (item) {
    await bot.sendMessage(chat_id, `Вы добавили "${item}" в список ${list}`)
    writeFile(`${dbPath}/lists/${password}.json`, JSON.stringify(newDb), (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    });
  }
  showList(bot, chat_id, list, newDb)
}

export const addItemByButton = (bot, chat_id, lastMessage, password, userLists, dbPath, item) => {
  const listName = lastMessage.replace('Добавить запись в список ', '').toLowerCase()
  console.log('LIST NAME : ')
  console.log(listName)
  // writeFile(`${dbPath}/lists/${password}.json`, JSON.stringify(newDb), (error) => {
  //   if (error) {
  //     console.log('An error has occurred ', error);
  //     return;
  //   }
  // });
}

export const removeItem = async (bot, chat_id, password, userLists, dbPath, text) => {
  const { newDb, list, item, removedItem } = action('remove', userLists, text)
  if (removedItem) {
    await bot.sendMessage(chat_id, `Вы удалили "${removedItem}" из списка ${list}`)
    writeFile(`${dbPath}/lists/${password}.json`, JSON.stringify(newDb), (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    });
  }
  showList(bot, chat_id, list, newDb)
}