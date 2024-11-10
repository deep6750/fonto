const topics = [
	{
		id: 'id-ef359e67-b739-4deb-f359-92f4da9bb273',
		number: '1',
		label: 'Voltage issue',
		information:
			'Discussion about the voltage value, different suggestions are made.',
	},
	{
		id: 'id-8f192732-77bb-4ae9-8712-63958219fca4',
		number: '2',
		label: 'ISO Misspelling',
		information:
			'ISO should be uppercased, check all occurrences mentioned in the comments.',
	},
	{
		id: 'id-6980a078-1fd6-425f-ca4a-9dd6617e9abb',
		number: '3',
		label: 'Missing term',
		information:
			'Multiple comments about a missing term in the terms list.',
	},
];

let topicCounter = 4;

module.exports = {
	getTopics: () => topics,
	getTopicCounter: () => topicCounter,
	addTopic: (newTopic) => {
		topics.push(newTopic);
		topicCounter++;
	},
	updateTopic: (topicIndex, updatedTopic) => {
		topics[topicIndex] = updatedTopic;
	},
	removeTopic: (topicIndex) => {
		topics.splice(topicIndex, 1);
	},
};
