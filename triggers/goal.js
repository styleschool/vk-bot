const { getRandomElement } = require('./utils');
const { enqueueMessage } = require('../outgoing-messages');

// Вы что-то хотели?
// Ты что-то хотел?
const goalQuestionRegex = /^\s*[вт]ы что-то хотели?[\s?)\\]*$/ui;

const goalAnswers = [
  "Да, предложить дружбу.",
];

const goalTrigger = {
  condition: (context) => {
    return goalQuestionRegex.test(context.request.text);
  },
  action: (context) => {
    enqueueMessage({
      ...context,
      response: {
        message: getRandomElement(goalAnswers)
      }
    });
  }
};

module.exports = {
  goalTrigger
};