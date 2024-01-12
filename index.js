const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
let mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Membuat schema user
const userSchema = new mongoose.Schema({
	username: { type: String, required: true },
});
let User = mongoose.model('User', userSchema);

// Membuat schema Exercise
const userExercise = new mongoose.Schema({
	_id: { type: String, required: true },
	username: { type: String, required: true },
	date: { type: String },
	duration: { type: Number, required: true },
	description: { type: String, required: true },
	logs: { type: Array, default: [] },
});
let Exercise = mongoose.model('Exercise', userExercise);

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html');
});

// Mengirimkan data diri user
app.post('/api/users', async (req, res) => {
	const createAndSaveUser = async () => {
		try {
			const newUser = new User({
				username: req.body.username,
			});

			const savedUser = await newUser.save();
			console.log('Succeed to save data');
			res.json({ username: savedUser.username, _id: savedUser._id });
		} catch (err) {
			console.error('Failed to save data:', err);
			res.status(500).json({ error: 'Failed to save data' });
		}
	};

	createAndSaveUser();
});

// Menampilkan semua user
app.get('/api/users', (req, res) => {
	const displayAllUser = async () => {
		try {
			const allUser = await User.find();
			console.log('Succeed to display data');
			res.json(allUser);
		} catch (err) {
			console.error('Failed to display data:', err);
			res.status(500).json({ error: 'Failed to display data' });
		}
	};

	displayAllUser();
});

// Menemukan dan mengisi deskripsi tugas
app.post('/api/users/:_id/exercises', async (req, res) => {
	const id = req.params._id;
	const description = req.body.description;
	const duration = parseInt(req.body.duration, 10);
	const dateExercise = Boolean(req.body.date)
		? new Date(req.body.date).toDateString()
		: new Date().toDateString();
	const findAndCreateExercise = async () => {
		try {
			const user = await User.findById(id);
			const exercise = await Exercise.findOne({ _id: user._id });
			// Mencari data exercise yang telah dibuat
			if (exercise) {
				await Exercise.updateOne(
					{ _id: user._id },
					{
						date: dateExercise,
						duration,
						description,
						$push: {
							logs: {
								date: dateExercise,
								duration,
								description,
							},
						},
					}
				);

				const exercise = await Exercise.findOne({ _id: user._id });
				res.json({
					_id: exercise._id,
					username: exercise.username,
					date: exercise.date,
					duration: exercise.duration,
					description: exercise.description,
				});
				return;
			}

			// Membuat data baru exercise
			const dataExercise = new Exercise({
				_id: user._id,
				username: user.username,
				date: dateExercise,
				duration,
				description,
				logs: [],
			});

			let dataLogs = dataExercise.logs;
			dataLogs.push({
				date: dataExercise.date,
				duration: dataExercise.duration,
				description: dataExercise.description,
			});
			dataExercise.logs = dataLogs;

			const savedExercise = await dataExercise.save();
			console.log('Succeed to save data');

			const displayData = {
				_id: savedExercise._id,
				username: savedExercise.username,
				date: savedExercise.date,
				duration: savedExercise.duration,
				description: savedExercise.description,
			};
			res.json(displayData);
		} catch (err) {
			console.error('Failed to create data:', err);
			res.status(500).json({ error: 'Failed to create data' });
		}
	};

	findAndCreateExercise();
});

// Menemukan dan menampilkan logs
app.get('/api/users/:_id/logs', async (req, res) => {
	const findAndModificateExercise = async () => {
		const limit = parseInt(req.query.limit, 10) || 0;
		const dateFrom = Date.parse(req.query.from);
		const dateTo = Date.parse(req.query.to);
		const id = req.params._id;
		try {
			const exercise = await Exercise.findById(id);

			const filteredExercise = exercise.logs.filter((exe) => {
				const logsDate = Date.parse(exe.date);
				if (dateFrom && dateTo) {
					const result = logsDate >= dateFrom && logsDate <= dateTo;
					return result;
				} else if (dateFrom) {
					return logsDate >= dateFrom;
				} else if (dateTo) {
					return logsDate <= dateTo;
				}
			});

			let logs = exercise.logs;
			if (dateFrom || dateTo) {
				logs = filteredExercise;
			}

			let limitedLogs = logs;
			if (limit) {
				limitedLogs = limitedLogs.slice(0, limit);
			}

			res.json({
				_id: exercise._id,
				username: exercise.username,
				count: limitedLogs.length,
				log: limitedLogs,
			});
		} catch (err) {
			console.error('Failed to display data:', err);
			res.status(500).json({ error: 'Failed to display data' });
		}
	};

	findAndModificateExercise();
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});
