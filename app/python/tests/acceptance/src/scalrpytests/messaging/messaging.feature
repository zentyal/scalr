Feature: Gearman messaging 

	Scenario: Prepare 
        I have test config
		I stop all mysql servers
		I start mysql server
		I drop test database
		I create test database
		I create table 'messages' in test database
		I create table 'servers' in test database
		I create table 'server_properties' in test database
		I stop all gearman servers

	Scenario: Fill database
		I make prepare
		I have 1 messages with status 0 and type 'out'

	Scenario: Client test
		I make prepare
		I have 1 messages with status 0 and type 'out'
		I have 1 messages with status 0 and type 'in'
		I have 1 messages with status 1 and type 'out'
		I have 1 messages with status 1 and type 'in'
		I start gearman server on port 4730
		I start test worker
		I start client
		I wait 1 seconds
		I stop test worker
        I stop client
		I stop all gearman servers
		I get 1 right messages ID from gearman server

	Scenario: Worker test
		I stop all gearman servers
		I start gearman server on port 4730
		I start worker
		I wait 1 seconds
		I stop worker
		I stop gearman server on port 4730

	Scenario: Client-Worker test
		I make prepare
		I have 2 messages with status 0 and type 'out'
		I have 2 messages with status 0 and type 'in'
		I have 2 messages with status 1 and type 'out'
		I have 2 messages with status 1 and type 'in'
		I start gearman server on port 4730
		I start worker
		I start client
		I wait 2 seconds
        I stop client
        I stop worker
        I stop gearman server on port 4730
		I see right messages deleted from database

	Scenario: Client-Worker mysql failure test
		I make prepare
		I have 200 messages with status 0 and type 'out'
		I start gearman server on port 4730
		I start worker
		I start client
		I wait 3 seconds
		I stop all mysql servers
		I wait 5 seconds
		I start mysql server
		I wait 15 seconds
        I stop client
		I wait 5 seconds
		I stop worker
		I stop gearman server on port 4730
		I see right messages deleted from database
