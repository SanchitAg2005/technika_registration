# &#x09;	User Dashboard / Event selection page

=============================================================================================================================================================



### ***Login page:-***

.unique id/email

.password

.register now

Note of process:-

1.user enters unique id and password .

2.if user enters wrong id password they have to asked to check the transcript which they got by the time of registration.

3.if no account available user can register to create the account.

=============================================================================================================================================================

### ***Sections in the dashboard:-***

=============================================================================================================================================================

#### ***1.Notification tab:-***

&#x20;  .shows the notification about the invites from leaders to join the event with name of group leader and the event name

&#x20;  .option to accept or decline the request

&#x20;  .if invite accepted the user is enrolled in that event and the event is added to his/her account details

&#x20;  .once the event accepted the users in added to the leaders team and can be seen in his dashboard

&#x20;  .if invite declined then the leader who sent the request will be sent the notification that the user has declined the request

&#x20;  .once request declined the leader will be shown empty slot where he/she added the user/participant





=============================================================================================================================================================

##### &#x20;

#### ***2.Personal detail tab:-***

&#x20;  .user can see his/her personal details which are :-  .name

&#x09;						.age

&#x09;						.email

&#x09;						.gender

&#x09;						.WhatsApp no.

&#x09;						.academic

&#x09;						.course

&#x09;						.class/semester/year

&#x09;						.payment id(UTR)

&#x09;						.password

&#x20;                                                       .events list

&#x20;  .user can download the receipt if he/she wants.



=============================================================================================================================================================



#### ***3.Event registration tab***



###### &#x20;  ***1.Indivudual events pages:-***

&#x20;                              1.Technical Events

&#x20; 					.Code Buster\*

&#x09;				.IntelliQuest\*

&#x09;				.BrainStorm Battle

&#x09;				.Circuit Crafter\*

&#x09;				.Electrofix Challenge\*

&#x09;				.EcoAI Challenge\*

&#x09;				.Coding Ladder

&#x09;				.Web Wizard\*

&#x09;				.Cyber Shield\*

&#x09;				.App Attack\*

&#x20;

&#x20;				2.Creative Events

&#x20;					.Poster Presentation\*

&#x20;					.Face Painting\*

&#x09;				.Pot Painting

&#x09;				.Photography

&#x09;				.Green Earth Challenge\*

&#x09;				.Need For Speed

&#x09;				.Battle Ground Mobile India\*

&#x09;				.Free Fire\*

&#x09;				.Technical Debate



&#x09;			 3.Cultural Events

&#x09;				.Solo Ramp Walk

&#x09;				.Sudoku

&#x09;				.Solo Singing

&#x09;				.Solo Dance

&#x09;				.Rap

&#x09;				.Beat Boxing

&#x09;				.Poetry

&#x09;				.Story Telling

&#x09;				.Art Attack

Legend:



No \* = Individual-only event.

\* = Minimum team size is 1, so you can participate solo or with a team.





NOTE OF PROCESS:-

&#x09;	.The individual event page will be opened from the event registration page.

&#x09;	.The events are listed inside the individual events page.

&#x09;	.The events which have no option to add participants will be mentioned "INDIVIDUAL"

&#x09;	.The events where you can add friends will show a note "to participate with friend register via team registration page ".

&#x20;          	.Once registered in the desired event the user will be enrolled in that particular event and cant be enrolled back.

&#x20;               .As the user enrolled in that event the data base will add that particular event in the users event list .



NOTE OF DATA COLLECTION:-

&#x20;             	.For event registration the data collection scheme is:-

&#x09;				\_id

&#x09;				eventId

&#x09;				userId

&#x09;				teamId (nullable)

&#x09;				status

&#x09;				registeredAt

&#x09;	.for Individual event registration the scheme is:-

&#x09;				eventId

&#x09;				userId

&#x09;				teamId : null

=============================================================================================================================================================

##### &#x20; ***2.Team event page:-***

&#x20;                              1.Technical Events

&#x09;				.Code Buster\* — 1–2 participants

&#x09;				.Red Tech — 2–4 participants

&#x09;				.Robo Wars — 2–4 participants

&#x09;				.Robo Race — 2–3 participants

&#x09;				.Robo Pick \& Place — 2–4 participants

&#x09;				.IntelliQuest\* — 1–4 participants

&#x09;				.Circuit Crafter\* — 1–3 participants

&#x09;				.Electrofix Challenge\* — 1–3 participants

&#x09;				.Junkyard Wars — 2–4 participants

&#x09;				.AI Quizathon — 2–4 participants

&#x09;				.EcoAI Challenge\* — 1–4 participants

&#x09;				.Project Model Exhibition — 2–4 participants

&#x09;				.Web Wizard\* — 1–2 participants

&#x09;				.Cyber Shield\* — 1–2 participants

&#x09;				.App Attack\* — 1–4 participants

&#x09;				.Data Dash — 2–3 participants

&#x09;				.Load Bridging — 2–4 participants



&#x09;			2.Creative Events

&#x09;				.Poster Presentation\* — 1–2 participants

&#x09;				.Face Painting\* — 1–2 participants

&#x09;				.Green Earth Challenge\* — 1–3 participants

&#x09;				.Cricket — 8 participants

&#x09;				.Battle Ground Mobile India\* — 1–4 participants

&#x09;				.Free Fire\* — 1–4 participants



&#x09;			3.Cultural Events

&#x09;				.Group Ramp Walk — 4–8 participants

&#x09;				.Treasure Hunt — 5 participants

&#x09;				.Tug Of War — 5 participants

&#x09;				.Fire Free Cooking — 2–4 participants

&#x09;				.Group Singing — 2–6 participants

&#x09;				.Group Dance — 5–10 participants



Legend:



No \* = Team participation is mandatory.

\* = You can participate either solo or as a team.

&#x20;

NOTE OF PROCESS:-

&#x20;     		.the team event page is opened from the event registration page

&#x20;               .the user/participant who is logged in is by default group leader/participant no.1

&#x20;               .each events has minimum or fixed no of participant fulfilling which only the team registration can be done

&#x09;	.to add a user leader needs to add the user by adding the email id or that particular user

&#x20;               .the email id linked with the requested user's unique id and the user has registered for the event only then the user will be added to the group event

&#x20;               .when leader adds the user it will be hold on queue and a request notification will be sent to the requested users notification tab.

&#x20;            	.if the requested users accepts the request then he/she will be successfully added to the group.

&#x09;	.if the requested user denies than the slot becomes empty and the leader receives a message in the notification panel that says "user xyz rejected 		 your request."

&#x20;		.unless leader adds the minimum 2 participants including him the register button wont appear in short the leader can register.

&#x09;	.once the participants are successfully added to the group and the event in registered ,the added participants data will be updated with the vents   		 name in the event list of all the added participants

&#x20;             	.A user/participant can only enroll in a event once and via one team only.

&#x09;	.If the user who is allredy enrolled in a event he/she cannot be sent request for that event.



NOTE OF DATA COLLECTION:-

&#x20;             	.For event registration the data collection scheme is:-

&#x09;				\_id

&#x09;				eventId

&#x09;				userId

&#x09;				teamId (nullable)

&#x09;				status

&#x09;				registeredAt

&#x09;	.For the team event registration the data collection will be :-

&#x09;				eventId : Cricket

&#x09;				userId : A

&#x09;				teamId : Team123

