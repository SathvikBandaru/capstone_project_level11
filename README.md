**Hi Guys ,I am Sathvik**

**The Project i have done is **

# Online Voting System

This is a Online Voting Platform built using Node.js, Express.js, Postgresql, Tailwincss which allows election administrators to sign up and create multiple elections. You can also create ballots of multiple questions with any number of voters for particular a election.

[![MIT License](https://img.shields.io/badge/Platform-Deployed-green.svg)](https://choosealicense.com/licenses/mit/)

Deployed App link:

## Demo link

https://www.loom.com/share/bba04b12e69948c2a1b439752fffdc78

## Features

- Fully Responsive platform
- Uses CSRF tokens to prevent attacks
- Admin will be able to signup
- Admin can create the elections
- Admin can create a ballot of questions in an election
- Admin can register voters
- Admin can launch election
- Admin can Preview results while election is running
- Elections administrator can set custom path to election
- Voter can login to voting page and submit his response
- Ending the election
- We cannot delete election after ending election
- We cannot edit questions after launching election
- We cannot edit questions,voters,options etc... after ending an election

## Tech Stack

**Client:** EJS, TailwindCSS, BootStrap

**Server:** Node, Express

**Database:** Postgres

## Installation

Don't forget to create the databse with corresponding name as mentioned in `config.json`

Go to the project directory

```bash
  cd WD_level_11
```

Install dependencies

```bash
  npm install
```

start server to run the website in localhost

```bash
  npm start
```

## Running Tests

To run tests,run the following command

```bash
  npm test
```
