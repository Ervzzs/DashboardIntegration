let HTML_;
const _taskContributorsReportID = "10600308";
const _Users = [{}];

const ProgressReport = {};
ProgressReport.Controller = {
  getProgressBarData: async () => {
    const myRequest = new ECP.EC_Request("FusionView");
    myRequest.AddRequestVariable("ReportID", _taskContributorsReportID);
    myRequest.AddRequestVariable("Format", "JSON");
    const response = await myRequest.Submit();
    return response;
  },
  // getContributorsData: async () => {
  //     const myRequest = new ECP.EC_Request("FusionView");
  //     myRequest.AddRequestVariable("ReportID", "6448474");
  //     myRequest.AddRequestVariable("Format", "JSON");
  //     const response = await myRequest.Submit();
  //     return response;
  // },
  getArrayIfExists: (Value, Key, ArrayRecords) => {
    const result = [];
    for (let i = 0; i < ArrayRecords.length; i++) {
      if (ArrayRecords[i][Key] === Value) {
        result.push(ArrayRecords[i]);
      }
    }
    return result;
  },
};

async function getUtilizationProgress() {
  const myRequest = new ECP.EC_Request("FusionView");
  myRequest.AddRequestVariable("ReportID", 10547128);
  myRequest.AddRequestVariable("Format", "JSON");
  const response = await myRequest.Submit();
  let percentageProgress = null;

  if (!EC_Fmt.isNull(response)) {
    percentageProgress = EC_Fmt.CDec(
      response.Export.Report.Row[0].ResolvedPercentage
    );
    appendUtilizationProgress(percentageProgress);
  }
}

async function getMemberUtilizationProgress() {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const myRequest = new ECP.EC_Request("FusionView");
  myRequest.AddRequestVariable("ReportID", 13706016);
  myRequest.AddParameter("Department", "PayLink", ECP.EC_Operator.Equals);
  myRequest.AddParameter(
    "Start Date",
    EC_Fmt.DateParseFormat(firstDay.toLocaleDateString())
  );
  myRequest.AddParameter(
    "End Date",
    EC_Fmt.DateParseFormat(lastDay.toLocaleDateString())
  );
  myRequest.AddRequestVariable("Format", "JSON");
  const response = await myRequest.Submit();
  return response.Export.Report.Row;
  // console.log(response.Export.Report.Row);
  // for(let i = 0; i<)
}

function appendUtilizationProgress(progress) {
  const progressContainer = document.getElementById("utilization-progress");
  const utilTitle = document.getElementById("utilization-title");
  utilTitle.innerHTML = `Team Progress: ${progress}%`;
  if (progress < 50) {
    progressContainer.innerHTML = `<div class="progress-bar">
        <div class="progress red" style="width:${progress}%;"></div>
        </div>`;
  } else if (progress > 50 && progress < 75) {
    progressContainer.innerHTML = `<div class="progress-bar">
        <div class="progress orange" style="width:${progress}%;"></div>
        </div>`;
  } else {
    progressContainer.innerHTML = `<div class="progress-bar">
        <div class="progress green" style="width:${progress}%;"></div>
        </div>`;
  }
}

ProgressReport.View = {
  createKPICards: async () => {
    ProgressReport.Records =
      await ProgressReport.Controller.getProgressBarData();
    const myRecordset = new ECP.EC_Recordset(ProgressReport.Records);
    const progress = myRecordset.Item("Completed");
    const completedTasks = myRecordset.Item("CompletedTasks");
    const assignedTasks = myRecordset.Item("AssignedTasks");
    const totalTaskContributions = myRecordset.Item("TotalTaskContributions");
    HTML_ = `<div id="card-container">
                    <div class="card-deck">
                        <div class="card">
                            <a class="card-body" target="_blank" href="Home?Format=HTML&DashboardID=100120&ReportID=6249277">
                                <p class="card-title c-green">${completedTasks}</p>
                                <small class="text-muted">Tasks Completed</small>
                            </a>
                        </div>
                        <div class="card">
                            <a class="card-body" target="_blank" href="Home?Format=HTML&DashboardID=100120&ReportID=6249277">
                                <p class="card-title c-blue">${assignedTasks}</p>
                                <small class="text-muted">Tasks Assigned</small>
                            </a>
                        </div>
                        <div class="card">
                            <a class="card-body" target="_blank" href="Home?Format=HTML&DashboardID=100120&ReportID=6249277">
                                <p class="card-title c-red">${totalTaskContributions}</p>
                                <small class="text-muted">Total Task Contributions</small>
                            </a>
                        </div>
                    </div>
                </div>`;
    document.getElementById("kpi-data").innerHTML = HTML_;
  },
};
async function getCurrentUserInfo(manager1) {
  const usersTableView = new ECP.EC_TableView("Users");
  usersTableView.SetFormat("JSON");
  usersTableView.SetMaxRecords(1000);
  usersTableView.AddColumn("UserID");
  usersTableView.AddColumn("UserName");
  usersTableView.AddColumn("Name");
  usersTableView.AddColumn("DocumentID");
  usersTableView.AddColumn("Department");
  usersTableView.AddColumn(
    "Users_Authentications^Authentications.AuthenticationID"
  );
  usersTableView.AddColumn("Users_Managers1^Managers1.Name");
  usersTableView.AddFilter("Name", manager1, ECP.EC_Operator.Equals);

  const data = await usersTableView.GetResults();
  const recordSet = new ECP.EC_Recordset(data);

  return recordSet;
}
async function getUsers() {
  const teamLead = "Matthew Paul N. Sayco";
  const currentUserInfoRecordSet = await getCurrentUserInfo(teamLead);
  const memberUtil = await getMemberUtilizationProgress();
  while (!currentUserInfoRecordSet.EOF) {
    const fullName = currentUserInfoRecordSet.Item("Name");
    const id = currentUserInfoRecordSet.Item("UserID");
    const authId = currentUserInfoRecordSet.Item(
      "Users_Authentications^Authentications.AuthenticationID"
    );
    const username = currentUserInfoRecordSet.Item("UserName");
    const img = currentUserInfoRecordSet.Item("Picture");
    createUserColumn(
      id,
      authId,
      username,
      img,
      fullName,
      !EC_Fmt.isNull(memberUtil)
        ? memberUtil.find(({ FullName }) => FullName === fullName)
        : ""
    );

    await getTasks(id, username);
    currentUserInfoRecordSet.MoveNext();
  }

  const paylinkTeamUsers = new ECP.EC_TableView("Users");

  paylinkTeamUsers.SetFormat("JSON");
  paylinkTeamUsers.SetMaxRecords(50);
  paylinkTeamUsers.AddColumn("UserID");
  paylinkTeamUsers.AddColumn("UserName");
  paylinkTeamUsers.AddColumn("Name");
  paylinkTeamUsers.AddColumn("Picture");
  paylinkTeamUsers.AddColumn("DocumentID");
  paylinkTeamUsers.AddColumn("Users_Managers1^Managers1.Name");
  paylinkTeamUsers.AddColumn(
    "Users_Authentications^Authentications.AuthenticationID"
  );
  // paylinkTeamUsers.AddFilter("Department", "CRM", ECP.EC_Operator.Equals);
  // paylinkTeamUsers.AddFilter("RoleID", 9, ECP.EC_Operator.NotEquals);
  paylinkTeamUsers.AddFilter("LocationID", "7", ECP.EC_Operator.Equals);
  // paylinkTeamUsers.AddFilter("Active", "True", ECP.EC_Operator.Equals);
  // paylinkTeamUsers.AddFilter("JobTitle", "Analyst", ECP.EC_Operator.NotLike);
  paylinkTeamUsers.AddFilter(
    "Users_Managers1^Managers1.Name",
    teamLead,
    ECP.EC_Operator.Equals
  );
  // paylinkTeamUsers.AddFilter("UserID", 21552, ECP.EC_Operator.Equals);
  // paylinkTeamUsers.AddSelectSort("JobTitle", ECP.EC_SortOrder.Desc);
  paylinkTeamUsers.AddSelectSort("UserID", ECP.EC_SortOrder.Asc);
  const usersData = await paylinkTeamUsers.GetResults();
  const usersRecordSet = new ECP.EC_Recordset(usersData);
  if (!EC_Fmt.isNull(memberUtil)) memberUtil.splice(0, 2);
  while (!usersRecordSet.EOF) {
    const id = usersRecordSet.Item("UserID");
    const authId = usersRecordSet.Item(
      "Users_Authentications^Authentications.AuthenticationID"
    );
    const username = usersRecordSet.Item("UserName");
    const fullName = usersRecordSet.Item("Name");
    const img = usersRecordSet.Item("Picture");
    _Users.push({ ID: id, Username: username });
    createUserColumn(
      id,
      authId,
      username,
      img,
      fullName,
      !EC_Fmt.isNull(memberUtil)
        ? memberUtil.find(({ FullName }) => FullName === fullName)
        : ""
    );
    await getTasks(id, username);
    usersRecordSet.MoveNext();
  }
}

async function getTasks(id, username) {
  const salesExeTasks = new ECP.EC_TableView("Tasks");
  salesExeTasks.AddSubTableJoinID("Tasks_Customers");
  salesExeTasks.AddColumn("TaskID");
  salesExeTasks.AddColumn("Task");
  salesExeTasks.AddColumn("ObjectiveTypeID");
  salesExeTasks.AddColumn("Unread");
  salesExeTasks.AddColumn("CustomField506");
  salesExeTasks.AddColumn("Tasks_Customers^Customers.ShortName");
  salesExeTasks.AddColumn("Days Old");
  salesExeTasks.AddColumn("CustomerID");
  salesExeTasks.AddFilter("AssignToUserID", id, ECP.EC_Operator.Equals);
  salesExeTasks.AddFilter("TaskStatusID", "Assigned", ECP.EC_Operator.Equals);
  let today = new Date();
  today = EC_Fmt.DateAdd(today, "day", 1);
  const dd = String(today.getDate() + 1).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  today = `${mm}/${dd}/${yyyy}`;
  salesExeTasks.AddFilter(
    "TimeUpdated",
    EC_Fmt.DateParseFormat(today),
    ECP.EC_Operator.LessThanEquals
  );

  salesExeTasks.AddSelectSort("TimeUpdated", ECP.EC_SortOrder.Desc);
  salesExeTasks.SetFormat("JSON");
  salesExeTasks.SetMaxRecords(1000);
  const data = await salesExeTasks.GetResults();
  const taskRecordSet = new ECP.EC_Recordset(data);
  while (!taskRecordSet.EOF) {
    const taskID = taskRecordSet.Item("TaskID");
    let task = taskRecordSet.ItemDBValue("Task");
    if (task.length > 100) {
      task = `${task.substring(0, 100)}...`;
    }
    const taskTitle = taskRecordSet.ItemDBValue("Task");
    const shortname = taskRecordSet.Item("Tasks_Customers^Customers.ShortName");
    const customerID = taskRecordSet.ItemDBValue("CustomerID");
    const objType = taskRecordSet.ItemDBValue("ObjectiveTypeID");
    const unread = taskRecordSet.ItemDBValue("Unread");
    const priority = taskRecordSet.ItemDBValue("CustomField506");
    const daysOld = taskRecordSet.ItemDBValue("Days Old");
    createtaskList(
      id,
      taskID,
      taskTitle,
      shortname,
      customerID,
      username,
      task,
      objType,
      unread,
      priority,
      daysOld
    );
    taskRecordSet.MoveNext();
  }
}

// get task details for drop down on each task card.
async function getTaskDetails(taskID, taskTitle) {
  const myTableView = new ECP.EC_TableView("TaskDetails");
  myTableView.AddFilter("TaskID", taskID, ECP.EC_Operator.Equals);
  myTableView.AddSelectSort("TaskDetailID", ECP.EC_SortOrder.Desc);
  myTableView.AddColumn("TaskDetail");
  myTableView.AddColumn("TaskDetailID");
  myTableView.AddColumn("TaskID");
  myTableView.AddColumn("TaskDetails_Tasks^Tasks.Task");
  myTableView.SetFormat("json");
  myTableView.SetMaxRecords(500);
  const results = await myTableView.GetResults();
  const myRecordSet = new ECP.EC_Recordset(results);
  const result = [];

  while (!myRecordSet.EOF) {
    result.push({
      TaskDetailID: myRecordSet.Item("TaskDetailID"),
      TaskDetails: myRecordSet.Item("TaskDetail").split("`"),
      TaskID: myRecordSet.Item("TaskID_DBValue"),
      Task: myRecordSet.Item("TaskDetails_Tasks^Tasks.Task_DBValue"),
    });
    myRecordSet.MoveNext();
  }
  createTaskDetails(result);
}

async function getStoryPoints(taskID, func) {
  const myFusionView = new ECP.EC_Request("FusionView");
  myFusionView.AddRequestVariable("ReportID", 13181161);
  myFusionView.AddRequestVariable("Format", "JSON");
  myFusionView.AddParameter("TaskID", taskID, ECP.EC_Operator.Equals);
  const data = await myFusionView.Submit();
  const myRecordSet = new ECP.EC_Recordset(data);
  const result = [];
  while (!myRecordSet.EOF) {
    result.push({
      Status: myRecordSet.Item("Status"),
      StoryPoints: myRecordSet.Item("Storypoints"),
      Color: myRecordSet.Item("Color"),
    });
    myRecordSet.MoveNext();
  }
  if (func) {
    createStoryPoints(result, func, taskID);
  }
  return result;
}

// async function get

/* const results = await myTableView.GetResults();
    const myRecordSet = new ECP.EC_Recordset(results);
    const resultArr = [];
    while (!myRecordSet.EOF) {
        let deadline = myRecordSet.Item("TaskDetails_Tasks^Tasks.Deadline");
        if (!EC_Fmt.isNull(deadline)) {
            deadline = EC_Fmt.DateParseFormat(deadline);
        }
        resultArr.push({
            TaskDetailID: myRecordSet.Item("TaskDetailID"),
            TaskDetails: myRecordSet.Item("TaskDetail").split("`"),
            TaskID: myRecordSet.Item("TaskID_DBValue"),
            Task: myRecordSet.Item("TaskDetails_Tasks^Tasks.Task_DBValue"),
            LocationID: myRecordSet.Item("TaskDetails_Tasks^Tasks_Customers^Customers_Locations^Locations.LocationID"),
            CustomerID: myRecordSet.Item("TaskDetails_Tasks^Tasks_Customers^Customers.CustomerID"),
            DeadLine: deadline,
            TimeCreated: myRecordSet.Item("TaskDetails_Tasks^Tasks.TimeCreated")
        });
        myRecordSet.MoveNext();
    }
    return resultArr;
    */

function createUserColumn(id, authId, userName, img, fullName, memberUtil) {
  const userCol = `<div class="parent" id="${id}">
    <div class="card" id="profile-card">
    <div class="member-image">
        ${img}
    </div>
    <a class="text-center avatarContainer" target="_blank" 
    href="TableView.aspx?TableName=Tasks&Parameters=F%3AAssignToUserID~V%3A${id}~O%3AE|F%3ATaskStatusID~V%3A1%5E2%5E3%5E4%5E5%5E8%5E23%5E25%5E27%5E28%5E29%5E31%5E32%5E35%5E40%5E44%5E45%5E46%5E47%5E66%5E67%5E68%5E69%5E70%5E71%5E72%5E73%5E76%5E77%5E78%5E79%5E82%5E83%5E84%5E85%5E86%5E88%5E89%5E90%5E92%5E93%5E95%5E100%5E101%5E102%5E106~O%3AE|F%3ATimeUpdated~V%3A10%2F24%2F2018%205%3A31%3A26%20PM~O%3AGE&SelectDisplayInParent=TaskID,Unread,CustomerID,Task,AssignToUserID,ObjectiveTypeID,ObjectiveID,TaskStatusID,CustomField505,CustomField501,CustomField502,CustomField506,TimeUpdated">
    <h2>${userName}</h2>
    </a>
    <div class="member-util-label">
    <h2>Monthly Utilization:${
      !EC_Fmt.isNull(memberUtil) ? memberUtil.Utilization : "0%"
    }</h2>
    </div>
    <div class="progress-bar">
    ${(() => {
      if (!EC_Fmt.isNull(memberUtil)) {
        if (EC_Fmt.CDec(memberUtil.Utilization) < 10) {
          return `<div class="progress red" style="width:${memberUtil.Utilization};"></div>`;
        }
        if (
          EC_Fmt.CDec(memberUtil.Utilization) > 10 &&
          EC_Fmt.CDec(memberUtil.Utilization) < 30
        ) {
          return `<div class="progress orange" style="width:${memberUtil.Utilization};"></div>`;
        }
        return `<div class="progress green" style="width:${memberUtil.Utilization};"></div>`;
      }
      return `<div class="progress red" style="width:0%;"></div>`;
    })()}
    </div>
    </div>
    <div class="parentCard" userId="${id}" id="${userName}" auth-id="${authId}"></div>
    </div>`;
  document.getElementById("TasksList").innerHTML += userCol;
  // get all parent classes for drag and drop function
  const parents = document.querySelectorAll(".parentCard");
  dragDrop(parents);
}

async function createtaskList(
  id,
  taskID,
  taskTitle,
  shortname,
  customerID,
  username,
  task,
  objType,
  unread,
  priority,
  daysOld
) {
  // const ReportData = await ProgressReport.Controller.getContributorsData();
  const checkKanbanData = await getStoryPoints(taskID);
  let taskData = "";
  taskData += `<div class="child bg-white text-dark ${username} ${
    priority === "1" ? "Priority" : ""
  } default d-flex flex-column" task-id="${taskID}" assigned-to="${id}" customer-id="${customerID}" draggable="true">
                    <div class="taskData">
                        <div class="d-flex justify-content-between">
                            <a href="TableView.aspx?TableName=Tasks&SubTable=TaskDetails&LinkField=TaskID&SubLinkField=TaskID&Search=%7cTaskID~${taskID}~E%7c" target="_blank"><h3>${shortname}: Task ${taskID}</h3></a>
                            <div class="badgeData d-flex justify-content-between">
                                <div class="badges">`;
  if (objType === "1") {
    taskData += '               <span class="badge badge-danger">Bug</span>';
  } else if (objType === "2") {
    taskData +=
      '               <span class="badge badge-success">Feature</span>';
  }
  if (unread.includes("span")) {
    taskData += '               <span class="badge badge-dark">Unread</span>';
  }
  taskData += "               </div>";

  taskData += "           </div>";
  taskData += `       </div>
                        <h4>${task}</h4>`;
  taskData += `   </div>
                    <hr>
                    <div class="data">
                        <div class="days-old">`;
  if (daysOld > 3) {
    taskData += `       <small class="text-red">DAYS OLD: ${daysOld}</small>`;
  } else {
    taskData += `       <small style="font-weight: bold;">DAYS OLD: ${daysOld} </small>`;
  }
  // if (objType === "1" && daysOld > 1) {
  //     taskData += `       <small class="text-red">DAYS OLD: ${daysOld}</small>`;
  // } else if (objType === "2" && daysOld > 5) {
  //     taskData += `       <small class="text-red">DAYS OLD: ${daysOld}</small>`;
  // } else {
  //     taskData += `       <small style="font-weight: bold;">DAYS OLD: ${daysOld} </small>`;
  // }
  // const Contributor = ProgressReport.Controller.getArrayIfExists(taskID, "TaskID", ReportData);
  // for (let i = 0; i < Contributor.length; i++) {
  //     taskData += `       <img class="avatar" src="${Contributor[i].Picture}">`;
  // }
  taskData += `       </div>
                        <div style="display:flex;margin-left:auto;width:40px;justify-content:space-between;">
                            <div class="kanban-container">
                                <a style="color:#000" target="_blank" href="https://encompasstech.com/Home?DashboardID=187332&Tab=You&TaskID=${taskID}&View=Task&UserID=${UserID}">
                                    <span class="ews-icon-emschedulelight" style="font-size:16px"></span>
                                    ${
                                      checkKanbanData.length > 0
                                        ? `<span class="notif"></span>`
                                        : ""
                                    }
                                </a>
                            </div>
                            <div class="alarm-container">
                                <span class="ews-icon-audit" style="font-size:16px"></span>
                            </div>
                        </div>
                        <div class="iconsCol d-flex flex-column flex-end">
                            <div class="ews-icon-insertsheet child-card-title" id="cardTitle${taskID}"></div>
                        </div>
                    </div>
                    <div id="taskDetails${taskID}" class="taskDetails bg-white hidden">
                        <div class="donutSpinner" id="spinner${taskID}">
                            <div class="loader"></div>
                        </div>
                    </div>
                </div>`;
  document.getElementById(`${username}`).innerHTML += taskData;
  const children = document.querySelectorAll(".child");
  dragDropChildren(children);
  const clickables = document.querySelectorAll(".child-card-title");
  for (let i = 0; i < clickables.length; i++) {
    clickables[i].addEventListener("click", toggle);
  }
  const utilization = document.querySelectorAll(".alarm-container");
  for (let i = 0; i < utilization.length; i++) {
    utilization[i].addEventListener("click", showUtilizationModal);
    utilization[i].addEventListener("click", setDate);
  }
  ECP.Dialog.HideLoading();
}

function createTaskDetails(taskDetailsArr) {
  let taskID;
  for (let i = 0; i < taskDetailsArr.length; i++) {
    let taskDetails;
    taskID = taskDetailsArr[i].TaskID;
    if (
      taskDetailsArr[i].TaskDetails[3].startsWith("<br>") ||
      taskDetailsArr[i].TaskDetails[3].startsWith("</br>")
    ) {
      taskDetails = taskDetailsArr[i].TaskDetails[3].replace("<br>", "");
    } else {
      taskDetails = taskDetailsArr[i].TaskDetails[3];
    }
    if (
      !taskDetails.includes("Assigned to") &&
      !taskDetails.includes("Status changed")
    ) {
      const collapse = `<div class="d-flex align-items-start taskDetailsSection">
                                    <a class="ews-icon-edit editThisTaskDetail hidden" task-id='${
                                      taskDetailsArr[i].TaskID
                                    }' task-detail-id="${
        taskDetailsArr[i].TaskDetailID
      }" task="${taskDetailsArr[i].Task}"></a>
                                    <p class="px-2 py-2 taskDetailId" id="${
                                      taskDetailsArr[i].TaskDetailID
                                    }">
                                        ${EC_Fmt.ReplaceAll(
                                          EC_Fmt.ReplaceAll(
                                            taskDetails,
                                            "<hr>",
                                            ""
                                          ),
                                          "<hr />",
                                          ""
                                        )}
                                    </p>
                                </div><hr>`;
      document.getElementById(
        `taskDetails${taskDetailsArr[i].TaskID}`
      ).innerHTML += collapse;
    }
  }
  document.getElementById(`spinner${taskID}`).classList.add("hidden");
}

function createStoryPoints(storyArr, func, taskID) {
  let html = `<div class="story-status-container-${taskID}">
                <div style="display:flex;">`;
  for (let i = 0; i < storyArr.length; i++) {
    const { Status, StoryPoints, Color } = storyArr[i];
    html += `
        <div style="margin:5px;border-radius:16px;width:100px;height:35px;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${Color}">
            <div class="story-status">
                ${Status}
            </div>
            <div class="story-count">
                ${StoryPoints}
            </div>
        </div>`;
  }
  html += "</div></div>";
  func(EC_Fmt.HtmlStrToElement(html));
}

async function toggle(event) {
  const taskID =
    event.currentTarget.parentElement.parentElement.parentElement.getAttribute(
      "task-id"
    );
  const status =
    event.currentTarget.parentElement.parentElement.parentElement.getAttribute(
      "assigned-to"
    );
  const storyContainer = (content) =>
    event.target
      .closest(".default")
      .querySelector(".donutSpinner")
      .insertAdjacentElement("afterend", content);
  const taskDetails = document.getElementById(`taskDetails${taskID}`);
  const storyPointContainer = document.querySelector(
    `.story-status-container-${taskID}`
  );
  const taskDetailsSection = taskDetails.querySelectorAll(
    ".taskDetailsSection"
  );
  if (taskDetailsSection.length > 0) {
    if (taskDetails.classList.contains("hidden")) {
      taskDetails.classList.remove("hidden");
    } else {
      taskDetails.classList.add("hidden");
    }
  } else if (taskDetails.classList.contains("hidden")) {
    taskDetails.classList.remove("hidden");
    document.getElementById(`spinner${taskID}`).classList.remove("hidden");
    await getStoryPoints(taskID, storyContainer);
    await getTaskDetails(taskID);
  } else {
    taskDetails.classList.add("hidden");
  }
  const elements = event.target
    .closest(".default")
    .querySelectorAll(".taskDetails");
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].id !== `taskDetails${taskID}`) {
      elements[i].classList.add("hidden");
    }
  }
}

async function addUtilizationHours(formData) {
  if (!formData) return;
  const myTableEdit = new ECP.EC_TableEdit("ZZ_TeamUtilization");
  myTableEdit.AddRecord();
  for (let i = 0; i < [...formData.entries()].length; i++) {
    const [field, value] = [...formData.entries()][i];
    myTableEdit.UpdateRecord(field, value);
  }
  const result = await myTableEdit.SaveRecord();
  if (result.Status === "Success") {
    ECP.HTML.Snackbar("Hours added", "Success");
  } else {
    ECP.HTML.Snackbar("Unable to add hours", "Error");
  }
}

async function addPtoHours(formData) {
  if (!formData) return;
  const myTableEdit = new ECP.EC_TableEdit("ZZ_TeamPTO");
  myTableEdit.AddRecord();
  for (let i = 0; i < [...formData.entries()].length; i++) {
    const [field, value] = [...formData.entries()][i];
    myTableEdit.UpdateRecord(field, value);
  }
  const result = await myTableEdit.SaveRecord();
  if (result.Status === "Success") {
    ECP.HTML.Snackbar("PTO hours added successfully");
  } else {
    ECP.HTML.Snackbar("Unable to add PTO hours");
  }
}

function showUtilizationModal(event) {
  const taskID = event.target.closest(".default")
    ? event.target.closest(".default").getAttribute("task-id")
    : "";
  ECP.Dialog.ShowDialog("Add Utilization Hours", utilizationForm(taskID), {
    width: "300",
    cancelButtonTitle: "Cancel",
    confirmButtonTitle: "Confirm",
    cancelButtonAction: () => {
      /* cancel code here */
    },
    confirmButtonAction: async (modal) => {
      modal.style.display = "block";
      const form = modal.querySelector("#UtilizationForm");
      const taskIDInput = document.querySelector(
        "ecp-auto-complete[inputname='TaskID']"
      );
      const formData = new FormData(form);
      if (taskID) {
        formData.append("TaskID", taskID);
      } else if (taskIDInput) {
        if (taskIDInput.shadowRoot.querySelector("#TaskIDHidden")) {
          formData.append(
            "TaskID",
            taskIDInput.shadowRoot.querySelector("#TaskIDHidden").value
          );
        }
      }
      const isValid = verifyInputFields(form);
      if (!isValid) return;
      await addUtilizationHours(formData);
      modal.remove();
    },
  });

  document.getElementById("timeEnded").addEventListener("blur", blurTime);
}

function showPtoModal(event) {
  ECP.Dialog.ShowDialog("Add PTO", ptoForm(), {
    width: "300",
    cancelButtonTitle: "Cancel",
    confirmButtonTitle: "Confirm",
    cancelButtonAction: () => {
      /* cancel code here */
    },
    confirmButtonAction: async (modal) => {
      modal.style.display = "block";
      const form = modal.querySelector("#PtoForm");
      const formData = new FormData(form);
      const isValid = verifyInputFields(form);
      if (!isValid) return;
      await addPtoHours(formData);
      modal.remove();
      /* edit object code here */
    },
  });
}

function verifyInputFields(form) {
  let valid = true;
  const errors = [];
  for (let i = 0; i < form.length; i++) {
    if (form[i].classList.contains("DatePickerInput")) i += 1;
    const element = form[i];
    if (element.name === "time-ended" || element.name === "time-started") {
      const temp = element.value;
    } else {
      const [key, value] = [element.name, element.value];
      if (key !== "TaskID") {
        element.closest("span").classList.remove("error");
      } else {
        element.closest("span").classList.remove("error");
      }
      if (key === "Hours" && !EC_Fmt.isNumber(value)) {
        element.closest("span").classList.add("error");
        valid = false;
        errors.push("Hours");
      }
      if (key === "Date" && EC_Fmt.isNull(value)) {
        element.closest("span").classList.add("error");
        valid = false;
        errors.push("Date");
      }
      if (key === "Reason" && EC_Fmt.isNull(value)) {
        element.closest("span").classList.add("error");
        valid = false;
        errors.push("Reason");
      }
      if (key === "UserID" && EC_Fmt.isNull(value)) {
        element.closest("span").classList.add("error");
        valid = false;
        errors.push("Full Name");
      }
      if (key === "PTO" && !EC_Fmt.isNumber(value)) {
        element.closest("span").classList.add("error");
        valid = false;
        errors.push("Hours");
      }
    }
  }
  if (!EC_Fmt.isNull(errors)) {
    ECP.HTML.Snackbar(
      `${errors.length > 1 ? errors.join(" and ") : errors[0]} ${
        errors.length > 1 ? "are" : "is a"
      } required field${errors.length > 1 ? "s" : ""}. ${
        errors.length > 1 ? "They" : "It"
      } must contain a valid value.`,
      "Error"
    );
  }
  return valid;
}

function blurTime() {
  const timeStart = document.getElementById("timeStarted").value;
  const timeEnded = document.getElementById("timeEnded").value;

  const timeStartArray = timeStart.split(":");
  const timeEndedArray = timeEnded.split(":");

  const timeStartSeconds =
    parseInt(timeStartArray[0], 10) * 60 * 60 +
    parseInt(timeStartArray[1], 10) * 60;
  const timeEndedSeconds =
    parseInt(timeEndedArray[0], 10) * 60 * 60 +
    parseInt(timeEndedArray[1], 10) * 60;

  const finalHours = computeTime(timeStartSeconds, timeEndedSeconds);
  document.getElementById("Hours").value = finalHours;
}

function setDate() {
  let today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0"); // January is 0!
  const yyyy = today.getFullYear();
  today = `${mm}/${dd}/${yyyy}`;

  document.querySelector(".Date").value = today;
}

function computeTime(convertedTimeStart, convertedTimeEnd) {
  const computation = (convertedTimeEnd - convertedTimeStart) / 3600;
  return computation.toFixed(2);
}
function utilizationForm(taskID) {
  const form = document.createElement("form");
  form.id = "UtilizationForm";
  const task = EC_Fmt.HtmlStrToElement(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <label><h4>Task ID:</h4></label>
        <span style="width:180px">
            ${
              taskID ||
              `<ecp-auto-complete inputName="TaskID" refTable="Tasks" refField="TaskID" refFieldDisplay="TaskID" dataType="ECP.DataType._Integer" refFieldDisplayDataType="ECP.DataType._Text" isSearch="false"></ecp-auto-complete>`
            }
            </span>
    </div>`);
  const date = EC_Fmt.HtmlStrToElement(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <label><h4>Date:</h4></label>
        <span style="width:180px;">
            <ecp-input curVal=${new Date().getDate()} fieldID="Date" id="pto-date" name="Date" fieldName="Date" class="Date"
             type="date" pickertype="single" subTabValue="Custom"></ecp-input>
        </span>
    </div>`);
  const timeStarted = EC_Fmt.HtmlStrToElement(`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <label><h4>Start Time:</h4></label>
        <span style="width:180px;">
        <input type="time" id="timeStarted" name="timeStarted" style="width:180px">
        </span>
    </div>`);
  const timeEnded = EC_Fmt.HtmlStrToElement(`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <label><h4>End Time:</h4></label>
        <span style="width:180px;">
        <input type="time" id="timeEnded" name="timeEnded" style="width:180px;">
        </span>
    </div>`);
  const hours = EC_Fmt.HtmlStrToElement(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <label><h4>Hours:</h4></label>
        <span style="width:180px;"><ecp-input id="Hours" name="Hours" ></ecp-input></span>
    </div>`);
  const memo = EC_Fmt.HtmlStrToElement(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <label><h4>Memo:</h4></label>
        <span style="width:180px;"><textarea id="Memo" name="Memo" style="width:180px;"></textarea></span>
    </div>`);
  form.append(task, date, timeStarted, timeEnded, hours, memo);
  return form;
}

function ptoForm() {
  const form = document.createElement("form");
  form.id = "PtoForm";
  const fullName = EC_Fmt.HtmlStrToElement(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <label><h4>Full Name:</h4></label>
        <span style="width:180px;"> <ecp-input style="box-sizing: border-box;"type="text" name="UserID" valuesArr="${_Users
          .map(({ ID, Username }) => `${ID},${Username}`)
          .join(";")}" ></ecp-input></span>
    </div>`);

  const date = EC_Fmt.HtmlStrToElement(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <label><h4>Date:</h4></label>
        <span style="width:180px;">
            <ecp-input curVal=${new Date().getDate()} fieldID="pto-date" id="Date" name="Date" class="Date"
            fieldName="Date" type="date" pickertype="single" subTabValue="Custom"></ecp-input>
        </span>
    </div>`);
  const ptoHours = EC_Fmt.HtmlStrToElement(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <label><h4>Hours:</h4></label>
        <span style="width:180px;"><ecp-input id="pto-hours" name="PTO" ></ecp-input></span>
    </div>`);
  const reason = EC_Fmt.HtmlStrToElement(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <label><h4>Reason:</h4></label>
        <span style="width:180px;">
        <ecp-auto-complete id="reason" name="Reason" isSearch="false" refTable="ZZ_TeamPTO" refField="Reason"
        refFieldDisplay="Reason" dataType="ECP.DataType._Integer" refFieldDisplayDataType="ECP.DataType._Text" ></ecp-auto-complete>
    </div>`);
  form.append(fullName, date, ptoHours, reason);
  return form;
}

// event listeners for all children.
function dragDropChildren(children) {
  for (let i = 0; i < children.length; i++) {
    children[i].addEventListener("click", multiSelectClickEvent);
    children[i].addEventListener("dragstart", dragStart);
    children[i].addEventListener("dragend", dragEnd);
  }
}

// event listeners for all parent.
function dragDrop(parents) {
  for (let i = 0; i < parents.length; i++) {
    parents[i].addEventListener("dragover", dragOver);
    parents[i].addEventListener("dragleave", dragLeave);
    parents[i].addEventListener("drop", drop);
  }
}

// Card click events
function multiSelectClickEvent(event) {
  if (event.ctrlKey || event.metaKey) {
    if (event.currentTarget.classList.contains("selectedChild")) {
      event.currentTarget.classList.remove("selectedChild");
    } else {
      event.currentTarget.classList.add("selectedChild");
    }
  } else if (event.shiftKey) {
    if (event.currentTarget.classList.contains("selectedChild")) {
      event.currentTarget.classList.remove("selectedChild");
      if (event.currentTarget.classList.contains("firstChild")) {
        event.currentTarget.classList.remove("firstChild");
      }
    } else {
      event.currentTarget.classList.add("selectedChild");
    }
    const selectedParent = event.currentTarget.parentElement;
    const selectedElements = selectedParent.querySelectorAll(".selectedChild");

    if (selectedElements.length) {
      selectedElements[0].classList.add("firstChild");
    }

    if (selectedElements.length > 2) {
      for (let i = 0; i < selectedElements.length - 1; i++) {
        if (i > 0) {
          selectedElements[i].classList.remove("selectedChild");
        }
      }
    }
    if (selectedElements.length > 1) {
      let currentElement = document.querySelector(".firstChild");
      let next = true;
      while (next) {
        if (!currentElement.nextSibling.classList.contains("selectedChild")) {
          currentElement.nextSibling.classList.add("selectedChild");
          currentElement = currentElement.nextSibling;
        } else {
          next = false;
        }
      }
    }
  } else {
    const allChildren = document.querySelectorAll(".child");
    for (let i = 0; i < allChildren.length; i++) {
      allChildren[i].classList.remove("selectedChild", "firstChild");
    }
  }
}

// drag functions for children.
function dragStart(event) {
  event.currentTarget.classList.add("selectedChild");
}

function dragEnd(e) {
  const element = document.getElementsByClassName("selectedChild");
  for (let i = 0; i < element.length; i++) {
    const newUser = element[i].parentElement.getAttribute("userId");
    let movedChild = element[i].getAttribute("assigned-to");
    if (movedChild !== newUser) {
      // change CSS of task card
      let newCSSClass = document.getElementById(`${newUser}`).children[1];
      newCSSClass = newCSSClass.getAttribute("id");
      element[i].setAttribute(
        "class",
        `child bg-white selectedChild text-dark ${newCSSClass} d-flex flex-column`
      );

      element[i].setAttribute("assigned-to", newUser);
      const movedChildTaskId = element[i].getAttribute("task-id");
      movedChild = element[i].getAttribute("assigned-to");

      const toast = document.getElementById("toastSave");
      toast.classList.add("show", "bg-save");
      toast.textContent = "Saving...";

      // start of TableEdit SDK function.
      const myTableEdit = new ECP.EC_TableEdit("Tasks");
      myTableEdit.EditRecord(movedChildTaskId);
      myTableEdit.UpdateRecord("AssignToUserID", movedChild);
      myTableEdit.SaveRecord().then(() => {
        document
          .getElementById("toastSave")
          .classList.remove("show", "bg-save");
        document.getElementById("toast").classList.add("show", "bg-success");
        if (element.length > 1) {
          document.getElementById(
            "toast"
          ).textContent = `Successfully Updated ${element.length} Tasks`;
        } else {
          document.getElementById(
            "toast"
          ).textContent = `Successfully Updated Task ${movedChildTaskId}`;
        }
        setTimeout(() => {
          document
            .getElementById("toast")
            .classList.remove("show", "bg-success");
        }, 3000);
      });
      // .catch(() => {
      //     document.getElementById("toast").classList.add("show", "bg-danger");
      //     if (element.length > 1) {
      //         document.getElementById("toast").textContent = `Failed To Update ${element.length} Tasks`;
      //     } else {
      //         document.getElementById("toast").textContent = `Failed To Update Task ${movedChildTaskId}`;
      //     }
      //     setTimeout(() => {
      //         document.getElementById("toast").classList.remove("show", "bg-danger");
      //     }, 3000);
      // });
    }
  }
}

// drag and drop functions for parents.
function dragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("draggedOver");
}

function dragLeave(event) {
  event.currentTarget.classList.remove("draggedOver");
}

function drop(event) {
  event.currentTarget.classList.remove("draggedOver");
  const elements = document.querySelectorAll(".selectedChild");
  for (let i = 0; i < elements.length; i++) {
    document
      .getElementById(`${event.currentTarget.getAttribute("id")}`)
      .appendChild(elements[i]);
  }
}

function appendPtoMenu() {
  if (UserID === 21522) {
    if (!document.getElementById("pto")) {
      const newElement = document.createElement(`li`);
      newElement.id = "pto";
      newElement.innerHTML = `<span class="ews-icon-calendar"></span> ADD PTO`;
      newElement.addEventListener("click", () => {
        showPtoModal();
        setDate();
      });
      document.querySelector("#dropdownContent ul").append(newElement);
    }
  }
}

async function main() {
  await ECP.Dialog.ShowLoading("Loading Tasks...");
  await getUsers();
  // document.querySelector(".ews-dashboard").style.height = "auto";
  await ProgressReport.View.createKPICards();
  getUtilizationProgress();
  appendUtilizationProgress();
  getMemberUtilizationProgress();
  //     await Users.View.createUserColumn();
  document.getElementById("kpi-button").onclick = () => {
    if (document.getElementById("kpi-data").classList.contains("hidden")) {
      document.getElementById("kpi-data").classList.remove("hidden");
    } else {
      document.getElementById("kpi-data").classList.add("hidden");
    }
  };
  document.getElementById("dropdown-button").classList.remove("hidden");
  document.getElementById("dropdown-button").addEventListener("click", () => {
    document.getElementById("dropdownContent").classList.toggle("active");
  });
  document
    .getElementById("dropdown-button")
    .addEventListener("click", appendPtoMenu);
  document
    .getElementById("util")
    .addEventListener("click", showUtilizationModal);
  document.getElementById("pm-task-button").innerHTML = ECP.HTML.Button(
    "pm-taks-button",
    "PM Tasks",
    ECP.HTML.Icons.Lists,
    ECP.HTML.ButtonActionType.Link,
    "",
    "ActionButton ActionButtonCustom"
  );
  document.getElementById("pm-task-button").href =
    "Home?DashboardID=100100&TableName=Tasks&SelectDisplayInParent=TaskID%2CUnread%2CCustomerID%2CTask%2CAssignToUserID%2CObjectiveTypeID%2CObjectiveID%2CTaskStatusID%2CCustomField505%2CCustomField501%2CCustomField502%2CCustomField506%2CTimeUpdated%2CTasks_ZZ_Features%5EZZ_Features_Users%5EUsers.UserName&SelectMaxRecords=5000&SelectSort=CustomField506&Parameters=F%3AAssignToUserID~V%3A16446~O%3AE|F%3ATaskStatusID~V%3A1%5E2%5E3%5E4%5E5%5E8%5E23%5E25%5E27%5E28%5E29%5E31%5E32%5E35%5E40%5E44%5E45%5E46%5E47%5E66%5E67%5E68%5E69%5E70%5E71%5E72%5E73%5E76%5E77%5E78%5E79%5E82%5E83%5E84%5E85%5E86%5E88%5E89%5E90%5E92%5E93%5E95%5E100%5E101%5E102%5E106~O%3AE|F%3ATimeUpdated~V%3A10%2F24%2F2018%205%3A31%3A26%20PM~O%3AGE|F%3ATasks_ZZ_Features%5EZZ_Features_Users%5EUsers.UserName~V%3ASayco%5EYZ%5EWilfred%5EJericho%5EErwin~O%3AE";
  document.getElementById("kpi-button").innerHTML = ECP.HTML.Button(
    "kpi-button",
    "KPI",
    ECP.HTML.Icons.FavoriteOn,
    ECP.HTML.ButtonActionType.JSEvent,
    "",
    "ActionButton ActionButtonCustom"
  );
  document.getElementById("kanban-button").innerHTML = ECP.HTML.Button(
    "kanban-button",
    "Kanban Board",
    ECP.HTML.Icons.EMScheduleLight,
    ECP.HTML.ButtonActionType.Link,
    "",
    "ActionButton ActionButtonCustom"
  );
  document.getElementById("kanban-button").href = "Home?DashboardID=187332";
}
// EWS.Ready(async () => {
//     await main();
// });

main();
