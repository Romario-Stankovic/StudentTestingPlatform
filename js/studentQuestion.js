let workInfo = null;

$(async function () {

    workInfo = JSON.parse(sessionStorage.getItem("workInfo"));

    dispalyTestName();
    updateTimer();

    setInterval(updateTimer, 1000);

    await displayQuestion();
})

function dispalyTestName() {
    let questionTestNameField = document.getElementById("questionTestNameField");
    questionTestNameField.innerText = workInfo.testName;
}

function updateTimer() {

    workInfo.questionDuration += 1;
    let questionTimer = document.getElementById("questionTimer");

    let endsAt = new Date(workInfo.endsAt);
    let current = new Date();
    let secondsLeft = clamp((endsAt.getTime() - current.getTime()) / 1000, 0, 86400);

    if (secondsLeft == 0) {
        finishWork();
    }

    questionTimer.innerText = new Date(secondsLeft * 1000).toISOString().substring(14, 19);
    sessionStorage.setItem("workInfo", JSON.stringify(workInfo));
}

async function displayQuestion() {

    let questionId = workInfo.questions[workInfo.currentQuestion];

    let questionResponse = await apiHandler(APIController.getWorkQuestion, workInfo.workId, questionId);

    if(questionResponse == undefined){
        alert("Could not contact API");
        return;
    }

    if (questionResponse.statusCode != undefined) {
        switch (questionResponse.statusCode) {
            case 401:
                studentLogout();
                break;
            case 403:
                alert("Forbidden");
                break;
            case 2001:
                alert("Failed to get question");
                await nextQuestion();
                break;
            default:
                console.log(questionResponse);
        }
        return;
    }

    let questionNumber = document.getElementById("questionNumber");
    let questionText = document.getElementById("questionText");
    let questionImage = document.getElementById("questionImage");
    let answerList = document.getElementById("answerList");

    let nextQuestionButton = document.getElementById("nextQuestionButton");

    if (workInfo.currentQuestion == workInfo.questions.length - 1) {
        nextQuestionButton.innerText = "Finish";
        nextQuestionButton.classList.add("redButton");
        nextQuestionButton.onclick = function (event) {
            finishWork();
        };
    }

    questionNumber.innerText = "Question: " + (workInfo.currentQuestion + 1) + "/" + workInfo.questions.length;

    questionText.innerText = questionResponse.questionText;

    questionImage.src = questionResponse.imagePath != null ? apiAssetsURL + "images/questions/" + questionResponse.imagePath : "img/noquestionimage.png";

    questionImage.hidden = questionResponse.imagePath != null ? "" : "hidden";

    if (questionResponse.imagePath == null) {
        let questionPanel = document.getElementById("questionPanel");
        questionPanel.classList.add("questionNoImage");
    }

    for (let answer of questionResponse.answers) {
        addAnswer(answerList, answer.answerId, answer.answerText, answer.imagePath, questionResponse.multichoice, answer.isChecked);
    }

    workInfo.questionDuration = questionResponse.duration;

}

async function nextQuestion() {

    let max = workInfo.questions.length - 1;

    if (workInfo.currentQuestion < max) {
        workInfo.currentQuestion += 1;
    } else {
        return;
    }

    let uploadResponse = await uploadAnswers();

    if (uploadResponse == true) {
        sessionStorage.setItem("workInfo", JSON.stringify(workInfo));
        window.location.reload();
    } else {
        window.location = "studentResult.html";
    }

}

async function previousQuestion() {

    if (workInfo.currentQuestion > 0) {
        workInfo.currentQuestion -= 1;
    } else {
        return;
    }

    let uploadResponse = await uploadAnswers();

    if (uploadResponse == true) {
        sessionStorage.setItem("workInfo", JSON.stringify(workInfo));
        window.location.reload();
    } else {
        window.location = "studentResult.html";
    }

}

async function finishWork() {

    await uploadAnswers();

    let data = {
        workId: workInfo.workId
    }

    let finishResponse = await apiHandler(APIController.finishWork, data);

    if(finishResponse == undefined){
        alert("Could not contact API");
        return;
    }

    if (finishResponse.statusCode != undefined) {
        switch (finishResponse.statusCode) {
            case 400:
                alert("Bad Request");
                break;
            case 401:
                studentLogout();
                break;
            case 403:
                alert("Forbidden");
                break;
            case 2001:
                alert("Work does not exist");
                break;
            case 3002:
                window.location = "studentResult.html";
                break;
            default:
                console.log(finishResponse);
        }
        return;
    }

    window.location = "studentResult.html";
}

async function uploadAnswers() {

    let answers = document.getElementsByName("answer");

    let data = {
        workId: workInfo.workId,
        duration: workInfo.questionDuration,
        answers: []
    }

    for (let answer of answers) {
        data.answers.push({ id: answer.id, isChecked: answer.checked });
    }

    let updateResponse = await apiHandler(APIController.updateWorkAnswers, data);
    
    if(updateResponse == undefined){
        alert("Could not contact API");
        return;
    }

    if (updateResponse.statusCode != undefined) {
        switch (updateResponse.statusCode) {
            case 0:
                return new Promise(resolve => { resolve(true) });
            case 400:
                alert(updateResponse.message);
                return new Promise(resolve => { resolve(false) });
            case 401:
                studentLogout();
                break;
            case 403:
                return new Promise(resolve => { resolve(false) });
            case 1001:
                return new Promise(resolve => { resolve(false) });
            case 201:
                return new Promise(resolve => { resolve(false) });
            case 3002:
                return new Promise(resolve => { resolve(false) });
            default:
                console.log(updateResponse);
        }
    }

}