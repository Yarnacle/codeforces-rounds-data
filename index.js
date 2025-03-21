const axios = require('axios');
const fs = require('fs');

const daysBackRange = [0,9999999];

let queue = [];
function next() {
	if (queue.length == 0) {
		console.log('Done with extras');
		return;
	}
	const contest = queue.pop();
	axios({
		method: 'get',
		url: `https://codeforces.com/api/contest.standings?contestId=${contest.id}&from=1&count=1`
	}).then(res => {
		let problems = res.data.result.problems;
		let totalRating = 0;
		for (let problem of problems) {
			totalRating += problem.rating;
		}
		contest.averageRating = totalRating / problems.length;
		fs.appendFileSync('contests.csv',Object.values(contest).map(val => `"${val}"`).join(',') + '\n');
		console.log(contest.roundNumber);
		next();
	});
}

axios({
	method: 'get',
	url: 'https://codeforces.com/api/contest.list?gym=false'
}).then(res => {
	const currentTime = new Date().getTime() / 1000;
	const contestList = res.data.result
		.filter(contest => contest.name.indexOf('Codeforces Round') != -1)
		.filter(contest => contest.phase == 'FINISHED')
		.filter(contest => currentTime - contest.startTimeSeconds < daysBackRange[1] * 24 * 60 * 60);
	axios({
		method: 'get',
		url: 'https://codeforces.com/api/problemset.problems'
	}).then(res => {
		const allProblems = res.data.result.problems;
		for (let contest of contestList) {
			const contestProblems = allProblems
			.filter(problem => problem.contestId == contest.id);
			let totalRating = 0;
			for (let problem of contestProblems) {
				totalRating += problem.rating;
			}
			contest.averageRating = totalRating / contestProblems.length;
			const nameWords = contest.name.split(' ');
			for (let i = 0; i < nameWords.length; i++) {
				nameWords[i] = nameWords[i].split('(').join('').split(')').join('').split(',').join('');
			}
			contest.roundNumber = nameWords[nameWords.indexOf('Codeforces') + 2];
			contest.division = nameWords[nameWords.indexOf('Div.') == -1 ? '':nameWords.indexOf('Div.') + 1];
			contest.startTime = new Date(contest.startTimeSeconds * 1000).toLocaleDateString();
			delete contest.freezeDurationSeconds;
		}

		fs.writeFileSync('contests.csv','ID,Name,Type,Phase,Frozen,Duration,Start time,Relative time,Average rating,Round number,Division,Date\n');
		for (let contest of contestList) {
			if (isNaN(contest.averageRating)) {
				continue;
			}
			if (contest.name.indexOf('Technocup') != -1) {
				continue;
			}
			const fil = contestList.filter(c => c.roundNumber == contest.roundNumber && (c.name.indexOf('Educational') == -1 && contest.name.indexOf('Educational') == -1));
			if (fil.length > 1 && contest.division == 2) {
				// console.log(fil);
				queue.push(contest);
				continue;
			}
			fs.appendFileSync('contests.csv',Object.values(contest).map(val => `"${val}"`).join(',') + '\n');
		}
		next();
		console.log('Done with first batch');
	});
});