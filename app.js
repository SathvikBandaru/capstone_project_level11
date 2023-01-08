const express = require("express");
const app = express();
const path = require("path");

//importing required models to run the elections
const { admin, StateElections, question, options,	voters,} = require("./models");

const bcrypt = require("bcrypt");
var cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const localStrategy = require("passport-local");
const passport = require("passport");

const flash = require("connect-flash");
const csrf = require("tiny-csrf");

const saltRounds = 10;

app.use(flash());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("ssh! some secret string!"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(
	session({
		secret: "my-super-secret-key-2178172615261562",
		cookie: {
			maxAge: 24 * 60 * 60 * 1000,
		},
	})
);

app.use(function (request, response, next) {
	response.locals.messages = request.flash();
	next();
});

app.use(passport.initialize());
app.use(passport.session());

//passport session for admin
passport.use(
	"adminlocal",
	new localStrategy(
		{
			usernameField: "Email",
			passwordField: "password",
		},
		(username, password, done) => {
			admin
				.findOne({ where: { Email: username } })
				.then(async (user) => {
					const result = await bcrypt.compare(
						password,
						user.password
					);
					if (result) {
						return done(null, user);
					} else {
						return done(null, false, {
							message: "Invalid password",
						});
					}
				})
				.catch((error) => {
					console.log(error);
					return done(null, false, {
						message: "Entered Email is not registered",
					});
				});
		}
	)
);

//passport session for voter
passport.use(
	"voter-local",
	new localStrategy(
		{
			usernameField: "VoterId",
			passwordField: "Password",
			passReqToCallback: true,
		},
		(request, username, password, done) => {
			voters
				.findOne({
					where: { VoterId: username, ElectionId: request.params.id },
				})
				.then(async (voter) => {
					const result = await bcrypt.compare(
						password,
						voter.Password
					);
					if (result) {
						return done(null, voter);
					} else {
						return done(null, false, {
							message: "Invalid password",
						});
					}
				})
				.catch((error) => {
					console.log(error);
					return done(null, false, {
						message: "This voter is not registered",
					});
				});
		}
	)
);

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((obj, done) => {
	done(null, obj);
});

//index page
app.get("/", (request, response) => {
	response.render("index");
});

//signup page
app.get("/signup", (request, response) => {
	response.render("signup", { csrf: request.csrfToken() });
});

//login page
app.get("/login", (request, response) => {
	if (request.user && request.user.id) {
		return response.redirect("/index");
	}
	response.render("login", { csrf: request.csrfToken() });
});

//index home page
app.get(
	"/index",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminid = request.user.id;
		const Admin = await admin.findByPk(adminid);

		const elections = await StateElections.findAll({
			where: { AdminId: request.user.id },
		});

		response.render("homepage", {
			username: Admin.name,
			elections: elections,
			csrf: request.csrfToken(),
		});
	}
);

//posting the admin details in admin table
app.post("/users", async (request, response) => {
	// validation checks
	if (request.body.Email.length === 0) {
		request.flash("error", "Enter email");
		return response.redirect("/signup");
	}

	if (request.body.password.length === 0) {
		request.flash("error", "Enter password");
		return response.redirect("/signup");
	}

	if (request.body.name.length === 0) {
		request.flash("error", "Enter name");
		return response.redirect("/signup");
	}

	if (request.body.password.length < 6) {
		request.flash("error", "The password length should be atleast 6");
		return response.redirect("/signup");
	}

	//checking whether the email is already exists or not
	const Admin = await admin.findOne({ where: { Email: request.body.Email } });
	if (Admin) {
		request.flash("error", "The email already in use");
		return response.redirect("/signup");
	}
	
	const hashpwd = await bcrypt.hash(request.body.password, saltRounds); 

	try {
		const user = await admin.create({
			name: request.body.name,
			Email: request.body.Email,
			password: hashpwd,
		});
		request.login(user, (err) => {
			if (err) {
				console.log(err);
				response.redirect("/");
			} else {
				request.flash("success", "succesfully created new admin");
				response.redirect("/index");
			}
		});
	} catch (error) {
		request.flash("error", error.message);
		return response.redirect("/signup");
	}
});

//login
app.post(
	"/session",
	passport.authenticate("adminlocal", {
		failureRedirect: "/login",
		failureFlash: true,
	}),
	function (request, response) {
		response.redirect("/index");
	}
);

//signout
app.get("/signout", (request, response) => {
	request.logout((err) => {
		if (err) {
			return next(err);
		} else {
			response.redirect("/");
		}
	});
});

app.get(
	"/election",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminid = request.user.id;
		const elections = await StateElections.findAll({
			where: { AdminId: adminid },
		});

		return response.json({ elections });
	}
);

//election home page
app.get(
	"/election/:id",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminid = request.user.id;
		const Admin = await admin.findByPk(adminid);
		const elections = await StateElections.findByPk(request.params.id);

		if (adminid !== elections.AdminId) {
			return response.render("error", {
				errorMessage: "sorry you don't have permission to view this page",
			});
		}

		const questions = await question.findAll({
			where: { 
        ElectionId: request.params.id 
      },
		});

		const Voters = await voters.findAll({ 
      where: { 
        ElectionId: request.params.id 
      },	
    });

		response.render("electionhomepage", {
			election: elections,
			username: Admin.name,
			questions: questions,
			voters: Voters,
			csrf: request.csrfToken(),
		});
	}
);

//create new election
app.get(
	"/elections/new",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminid = request.user.id;
		const Admin = await admin.findByPk(adminid);

		response.render("create_election", {
			username: Admin.name,
			csrf: request.csrfToken(),
		});
	}
);

//posting the election details to election table
app.post(
	"/election",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		if (request.body.name.trim().length === 0) {
			request.flash("error", "Election name can't be empty");
			return response.redirect("/elections/new");
		}

		const adminid = request.user.id;

		// validation checks
		const election = await StateElections.findOne({
			where: { AdminId: adminid, name: request.body.name },
		});
		if (election) {
			request.flash("error", "Election name already used");
			return response.redirect("/elections/new");
		}

		try {
			await StateElections.add(adminid, request.body.name);
			response.redirect("/index");
		} catch (error) {
			console.log(error);
			response.send(error);
		}
	}
);

//editing the election name
app.get(
	"/election/:id/edit",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminid = request.user.id;
		const election = await StateElections.findByPk(request.params.id);
		const Admin = await admin.findByPk(adminid);

		if (adminid !== election.AdminId) {
			return response.render("error", {
				errorMessage:
					"You are not authorized to perform this operation",
			});
		}

		response.render("Edit_Election", {
			election: election,
			username: Admin.name,
			csrf: request.csrfToken(),
		});
	}
);

//updating the election name in election table
app.post(
	"/election/:id",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminid = request.user.id;
		const elections = await StateElections.findByPk(request.params.id);

		if (adminid !== elections.AdminId) {
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		// validation checks
		if (request.body.name.trim().length === 0) {
			request.flash("error", "Election name can't be empty");
			return response.redirect(`/election/${request.params.id}/edit`);
		}
		const sameElection = await StateElections.findOne({
			where: {
				AdminId: adminid,
				name: request.body.name,
			},
		});

		if (sameElection) {
			if (sameElection.id.toString() !== request.params.id) {
				request.flash("error", "Election name already used");
				return response.redirect(`/election/${request.params.id}/edit`);
			} else {
				request.flash("error", "No changes made");
				return response.redirect(`/election/${request.params.id}/edit`);
			}
		}

		try {
			await StateElections.update(
				{ name: request.body.name },
				{ where: { id: request.params.id } }
			);
			response.redirect(`/election/${request.params.id}`);
		} catch (error) {
			console.log(error);
			return response.send(error);
		}
	}
);

//deleting the election and all election details
app.delete(
	"/election/:id",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;
		const election = await StateElections.findByPk(request.params.id);

		if (adminID !== election.AdminId) {
			console.log("You are not authorized to perform this operation");
			return response.redirect("/index");
		}

		// get all questions of that election
		const questions = await question.findAll({
			where: { ElectionId: request.params.id },
		});

		// delete all options and then questions of that election
		questions.forEach(async (Question) => {
			const Options = await options.findAll({
				where: { QuestionId: Question.id },
			});
			Options.forEach(async (option) => {
				await options.destroy({ where: { id: option.id } });
			});
			await question.destroy({ where: { id: Question.id } });
		});

		// delete voters of the election
		const Voters = await voters.findAll({
			where: { ElectionId: request.params.id },
		});
		Voters.forEach(async (voter) => {
			await voters.destroy({ where: { id: voter.id } });
		});

		try {
			await StateElections.destroy({ where: { id: request.params.id } });
			return response.json({ ok: true });
		} catch (error) {
			console.log(error);
			response.send(error);
		}
	}
);

//questions
app.get(
	"/election/:id/questions",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const allQuestions = await question.findAll({
			where: { ElectionId: request.params.id },
		});

		return response.send(allQuestions);
	}
);

//adding the question to particular election
app.post(
	"/election/:id/questions/add",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminid = request.user.id;

		const election = await StateElections.findByPk(request.params.id);

		if (adminid !== election.AdminId) {
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		if (election.launched) {
			console.log("Election already launched");
			return response.render("error", {
				errorMessage:
					"You can't edit the election now, the election is already launched",
			});
		}

		// validation checks
		if (request.body.title.trim().length === 0) {
			request.flash("error", "Question title can't be empty");
			return response.redirect(`/election/${request.params.id}`);
		}

		const sameQuestion = await question.findOne({
			where: { ElectionId: request.params.id, title: request.body.title },
		});
		if (sameQuestion) {
			request.flash("error", "Question title already used");
			return response.redirect(`/election/${request.params.id}`);
		}

		try {
			await question.add(
				request.body.title,
				request.body.description,
				request.params.id
			);
			response.redirect(`/election/${request.params.id}`);
		} catch (error) {
			console.log(error);
			return response.send(error);
		}
	}
);

//editing question name and description for a particular election
app.get(
	"/election/:ElectionId/question/:QuestionId/edit",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;
		const Admin = await admin.findByPk(adminID);
		const election = await StateElections.findByPk(
			request.params.ElectionId
		);

		if (election.AdminId !== adminID) {
			console.log("You don't have access to edit this election");
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		if (election.launched) {
			console.log("Election already launched");
			return response.render("error", {
				errorMessage: "Invalid request, election is already live",
			});
		}

		const Question = await question.findByPk(request.params.QuestionId);
		response.render("Edit_Question", {
			username: Admin.name,
			election: election,
			question: Question,
			csrf: request.csrfToken(),
		});
	}
);

//updating question details
app.post(
	"/election/:ElectionId/question/:QuestionId/update",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		console.log("found");
		const adminID = request.user.id;
		const election = await StateElections.findByPk(
			request.params.ElectionId
		);

		if (election.AdminId !== adminID) {
			console.log("You don't have access to edit this election");
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		if (election.launched) {
			console.log("Election already launched");
			return response.render("error", {
				errorMessage: "Invalid request, election is already launched",
			});
		}

		// validation checks
		if (request.body.title.trim().length === 0) {
			request.flash("error", "Question name cannot be empty");
			return response.redirect(
				`/election/${request.params.ElectionId}/question/${request.params.QuestionId}/edit`
			);
		}
		const sameQuestion = await question.findOne({
			where: {
				title: request.body.title,
				description: request.body.description,
				ElectionId: request.params.ElectionId,
			},
		});
		if (sameQuestion) {
			if (sameQuestion.id.toString() === request.params.QuestionID) {
				request.flash("error", "Question name is same as before");
				return response.redirect(
					`/election/${request.params.ElectionId}/question/${request.params.QuestionId}/edit`
				);
			} else {
				request.flash("error", "Question name already used");
				return response.redirect(
					`/election/${request.params.ElectionId}/question/${request.params.QuestionId}/edit`
				);
			}
		}

		try {
			await question.edit(
				request.body.title,
				request.body.description,
				request.params.QuestionId
			);
			response.redirect(
				`/election/${request.params.ElectionId}/question/${request.params.QuestionId}`
			);
		} catch (error) {
			console.log(error);
			return;
		}
	}
);

//deleting question for a particular election
app.delete(
	"/election/:id/question/:QuestionId",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;
		const election = await StateElections.findByPk(request.params.id);

		if (election.AdminId !== adminID) {
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		try {
			// deleting all options of that question
			await options.destroy({
				where: { QuestionId: request.params.QuestionId },
			});

			// delete question
			await question.destroy({
				where: { id: request.params.QuestionId },
			});
			return response.json({ ok: true });
		} catch (error) {
			console.log(error);
			return response.send(error);
		}
	}
);

//questions home page
app.get(
	"/election/:id/question/:QuestionId",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;
		const Admin = await admin.findByPk(adminID);
		const election = await StateElections.findByPk(request.params.id);

		if (election.AdminId !== adminID) {
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		const Question = await question.findByPk(request.params.QuestionId);

		const Options = await options.findAll({
			where: { QuestionId: request.params.QuestionId },
		});

		response.render("questionshomepage", {
			username: Admin.name,
			question: Question,
			election: election,
			options: Options,
			csrf: request.csrfToken(),
		});
	}
);

//options
app.get(
	"/election/:ElectionId/question/:QuestionId/options",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const Options = await options.findAll({
			where: { QuestionId: request.params.QuestionId },
		});
		return response.send(Options);
	}
);

//adding options to particular question
app.post(
	"/election/:ElectionId/question/:QuestionId/options/add",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;

		const election = await StateElections.findByPk(
			request.params.ElectionId
		);

		if (election.AdminId !== adminID) {
			console.log("You don't have access to edit this election");
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		if (election.launched) {
			console.log("Election already launched");
			return response.render("error", {
				errorMessage: "Election is already live",
			});
		}

		// validation checks
		if (request.body.choice.length === 0) {
			request.flash("error", "Option can't be empty");
			return response.redirect(
				`/election/${request.params.ElectionId}/question/${request.params.QuestionId}`
			);
		}

		const sameOption = await options.findOne({
			where: {
				QuestionId: request.params.QuestionId,
				choice: request.body.choice,
			},
		});
		if (sameOption) {
			request.flash("error", "Option already exists");
			return response.redirect(
				`/election/${request.params.ElectionId}/question/${request.params.QuestionId}`
			);
		}

		try {
			await options.add(request.body.choice, request.params.QuestionId);
			response.redirect(
				`/election/${request.params.ElectionId}/question/${request.params.QuestionId}`
			);
		} catch (error) {
			console.log(error);
			return response.send(error);
		}
	}
);

//editing options for a particular question
app.get(
	"/election/:ElectionId/question/:QuestionId/option/:optionID/edit",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;
		const Admin = await admin.findByPk(adminID);
		const election = await StateElections.findByPk(
			request.params.ElectionId
		);

		if (election.AdminId !== adminID) {
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		if (election.launched) {
			console.log("Election already launched");
			return response.render("error", {
				errorMessage: "Invalid request, election is already launched",
			});
		}

		const Question = await question.findByPk(request.params.QuestionId);
		const option = await options.findByPk(request.params.optionID);
		response.render("Edit_Option", {
			username: Admin.name,
			election: election,
			question: Question,
			option: option,
			csrf: request.csrfToken(),
		});
	}
);

//posting the updated details to options table
app.post(
	"/election/:ElectionId/question/:QuestionId/option/:optionID/update",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;
		const election = await StateElections.findByPk(
			request.params.ElectionId
		);

		if (election.AdminId !== adminID) {
			console.log("You don't have access to edit this election");
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		if (election.launched) {
			console.log("Election already launched");
			return response.render("error", {
				errorMessage: "Invalid request, election is already launched",
			});
		}

		// validation checks
		if (request.body.choice.trim().length === 0) {
			request.flash("error", "Option can't be empty");
			return response.redirect(
				`/election/${request.params.ElectionId}/question/${request.params.QuestionId}/option/${request.params.optionID}/edit`
			);
		}

		const sameOption = await options.findOne({
			where: {
				QuestionId: request.params.QuestionId,
				choice: request.body.choice,
			},
		});

		if (sameOption) {
			if (sameOption.id.toString() !== request.params.optionID) {
				request.flash("error", "Option already exists");
				return response.redirect(
					`/election/${request.params.ElectionId}/question/${request.params.QuestionId}/option/${request.params.optionID}/edit`
				);
			} else {
				request.flash("error", "No changes made");
				return response.redirect(
					`/election/${request.params.ElectionId}/question/${request.params.QuestionId}/option/${request.params.optionID}/edit`
				);
			}
		}

		try {
			await options.edit(request.body.choice, request.params.optionID);
			response.redirect(
				`/election/${request.params.ElectionId}/question/${request.params.QuestionId}`
			);
		} catch (error) {
			console.log(error);
			return;
		}
	}
);

//deleting a option for a particular question
app.delete(
	"/election/:ElectionId/question/:QuestionId/option/:id",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;
		const election = await StateElections.findByPk(
			request.params.ElectionId
		);

		if (election.AdminId !== adminID) {
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		const Question = await question.findByPk(request.params.QuestionId);

		if (!Question) {
			console.log("Question not found");
			return response.render("error", {
				errorMessage: "Question not found",
			});
		}

		try {
			await options.destroy({ where: { id: request.params.id } });
			return response.json({ ok: true });
		} catch (error) {
			console.log(error);
			return response.send(error);
		}
	}
);

//preview election
app.get(
	"/election/:id/preview",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;
		const election = await StateElections.findByPk(request.params.id);

		if (election.AdminId !== adminID) {
			console.log("You don't have access to edit this election");
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		const questions = await question.findAll({
			where: { ElectionId: request.params.id },
		});

		const Options = [];

		for (let i = 0; i < questions.length; i++) {
			const allOption = await options.findAll({
				where: { QuestionId: questions[i].id },
			});
			Options.push(allOption);
		}

		response.render("previewhomepage", {
			election: election,
			questions: questions,
			options: Options,
		});
	}
);

//launching election
app.get(
	"/election/:id/launch",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		console.log("launch initiaited");
		const adminID = request.user.id;
		const election = await StateElections.findByPk(request.params.id);

		// ensure that admin has access rights
		if (election.AdminId !== adminID) {
			console.log("You don't have access to edit this election");
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		// ensure that there is atelast 1 question in the election
		const questions = await question.findAll({
			where: { ElectionId: request.params.id },
		});
		if (questions.length === 0) {
			request.flash("launch", "Please add atleast 1 question");
			return response.redirect(`/election/${request.params.id}`);
		}

		// ensure that each question has alteast 2 options
		for (let i = 0; i < questions.length; i++) {
			const Options = await options.findAll({
				where: { QuestionId: questions[i].id },
			});
			if (Options.length < 1) {
				request.flash(
					"launch",
					"Please add atleast 2 options to each question"
				);
				return response.redirect(`/election/${request.params.id}`);
			}
		}

		// ensure that there is atleast 1 voter
		const Voters = await voters.findAll({
			where: { ElectionId: request.params.id },
		});
		if (Voters.length === 0) {
			request.flash("launch", "Please add atleast 1 voter");
			return response.redirect(`/election/${request.params.id}`);
		}

		try {
			await StateElections.launch(request.params.id);
			return response.redirect(`/election/${request.params.id}`);
		} catch (error) {
			console.log(error);
			return response.send(error);
		}
	}
);

//voting page
app.get("/election/:id/vote", async (request, response) => {
	const election = await StateElections.findByPk(request.params.id);

	if (election.launched === false) {
		console.log("Election not launched");
		return response.render("error", {
			errorMessage: "Election not launched yet",
		});
	}

	// redirect to results page if election is over
	if (election.ended === true) {
		console.log("Election ended");
		return response.redirect(`/election/${request.params.id}/result`);
	}

	const questions = await question.findAll({
		where: {
			ElectionId: request.params.id,
		},
	});
	const Options = [];

	for (let i = 0; i < questions.length; i++) {
		const allOption = await options.findAll({
			where: { QuestionId: questions[i].id },
		});
		Options.push(allOption);
	}

	// voter logged in
	if (request.user && request.user.id && request.user.VoterId) {
		const voter = await voters.findByPk(request.user.id);

		response.render("voterdetails", {
			election: election,
			questions: questions,
			options: Options,
			verified: true,
			submitted: voter.status,
			voter: voter,
			csrf: request.csrfToken(),
		});
	} else {
		response.render("voterdetails", {
			election: election,
			questions: [],
			options: [],
			verified: false,
			submitted: false,
			csrf: request.csrfToken(),
		});
	}
});

// add voter
app.post(
	"/election/:id/voters/add",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;
		const election = await StateElections.findByPk(request.params.id);

		if (election.AdminId !== adminID) {
			console.log("You don't have access to edit this election");
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		if (election.ended) {
			return response.render("error", {
				errorMessage: "Invalid request, election is ended",
			});
		}

		// validation checks
		if (request.body.VoterId.trim().length === 0) {
			request.flash("voterError", "Voter ID can't be empty");
			return response.redirect(`/election/${request.params.id}`);
		}

		if (request.body.Password.length === 0) {
			request.flash("voterError", "Password can't be empty");
			return response.redirect(`/election/${request.params.id}`);
		}

		if (request.body.Password.length < 5) {
			request.flash("voterError", "Password must be of atleast length 5");
			return response.redirect(`/election/${request.params.id}`);
		}

		const sameVoter = await voters.findOne({
			where: {
				ElectionId: request.params.id,
				VoterId: request.body.VoterId,
			},
		});
		if (sameVoter) {
			request.flash("voterError", "Voter ID already used");
			return response.redirect(`/election/${request.params.id}`);
		}

		try {
			// hash the password
			const hashpwd = await bcrypt.hash(
				request.body.Password,
				saltRounds
			);

			await voters.add(request.body.VoterId, hashpwd, request.params.id);
			response.redirect(`/election/${request.params.id}`);
		} catch (error) {
			console.log(error);
			return response.send(error);
		}
	}
);

//deleting the voter
app.post(
	"/election/:ElectionId/voter/:voterID/delete",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;
		const election = await StateElections.findByPk(
			request.params.ElectionId
		);

		if (election.AdminId !== adminID) {
			console.log("You don't have access to edit this election");
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		if (election.ended) {
			return response.render("error", {
				errorMessage: "Inavlid request, election is ended",
			});
		}

		const voter = await voters.findByPk(request.params.voterID);

		if (voter.status) {
			return response.render("error", {
				errorMessage: "Invalid request, voter has already voted",
			});
		}

		try {
			await voters.delete(request.params.voterID);
			return response.json({ ok: true });
		} catch (error) {
			console.log(error);
			return response.send(error);
		}
	}
);

// login voter
app.post(
	"/election/:id/vote",
	passport.authenticate("voter-local", {
		failureRedirect: "back",
		failureFlash: true,
	}),
	function (request, response) {
		return response.redirect(`/election/${request.params.id}/vote`);
	}
);

//voter response for a particular election
app.post(
	"/election/:ElectionId/voter/:id/submit",
	async (request, response) => {
		const election = await StateElections.findByPk(
			request.params.ElectionId
		);

		// validation checks
		if (election.launched === false) {
			console.log("Election not launched");
			return response.render("error", {
				errorMessage: "Election not launched yet",
			});
		}

		if (election.ended === true) {
			console.log("Election ended");
			return response.render("error", {
				errorMessage: "Election has ended",
			});
		}

		try {
			const questions = await question.findAll({
				where: {
					ElectionId: request.params.ElectionId,
				},
			});

			let responses = [];

			for (let i = 0; i < questions.length; i++) {
				const responseID = Number(
					request.body[`question-${questions[i].id}`]
				);
				responses.push(responseID);
			}

			// add responses of voter
			await voters.addResponse(request.params.id, responses);

			// mark the voter as voted
			await voters.markVoted(request.params.id);

			// render thank you message
			return response.redirect(`/election/${election.id}/vote`);
		} catch (error) {
			console.log(error);
			return response.send(error);
		}
	}
);

//ending election
app.put(
	"/election/:id/end",
	connectEnsureLogin.ensureLoggedIn(),
	async (request, response) => {
		const adminID = request.user.id;
		const election = await StateElections.findByPk(request.params.id);

		// ensure that admin has access rights
		if (election.AdminId !== adminID) {
			console.log("You don't have access to edit this election");
			return response.render("error", {
				errorMessage: "You are not authorized to view this page",
			});
		}

		if (election.ended === true || election.launched === false) {
			console.log("Election not launched");
			return response.render("error", {
				errorMessage: "Invalid Request",
			});
		}

		try {
			await StateElections.end(request.params.id);
			return response.json({ ok: true });
		} catch (error) {
			console.log(error);
			return response.send(error);
		}
	}
);



module.exports = app;
