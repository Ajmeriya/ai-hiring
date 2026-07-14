import json

from catalog.common import sql_question


def setup_sql(statements):
    return json.dumps({"setup_sql": statements})


QUESTIONS = [
    sql_question(
        title="Employees Earning More Than Their Managers",
        topic="SQL",
        difficulty="easy",
        tags=["SQL", "JOIN"],
        statement="Write a query to find the names of employees who earn more than their managers.",
        constraints_text="Use the Employee table with columns Id, Name, Salary, ManagerId.",
        input_format="The database is already populated before the query runs.",
        output_format="Print the employee names in alphabetical order using the column name Employee.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Employee (Id INT, Name TEXT, Salary INT, ManagerId INT)",
                "INSERT INTO Employee VALUES (1, 'Joe', 70000, 3)",
                "INSERT INTO Employee VALUES (2, 'Henry', 80000, 4)",
                "INSERT INTO Employee VALUES (3, 'Sam', 60000, NULL)",
                "INSERT INTO Employee VALUES (4, 'Max', 90000, NULL)"
            ]), "expected_output": "Joe", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Employee (Id INT, Name TEXT, Salary INT, ManagerId INT)",
                "INSERT INTO Employee VALUES (1, 'Alice', 100, 2)",
                "INSERT INTO Employee VALUES (2, 'Bob', 90, NULL)",
                "INSERT INTO Employee VALUES (3, 'Cara', 200, 2)"
            ]), "expected_output": "Cara", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Employee (Id INT, Name TEXT, Salary INT, ManagerId INT)",
                "INSERT INTO Employee VALUES (1, 'A', 10, NULL)",
                "INSERT INTO Employee VALUES (2, 'B', 20, 1)"
            ]), "expected_output": "B", "hidden": True},
        ],
        solution_code="SELECT e.Name AS Employee FROM Employee e JOIN Employee m ON e.ManagerId = m.Id WHERE e.Salary > m.Salary ORDER BY e.Name;",
    ),
    sql_question(
        title="Recyclable and Low Fat Products",
        topic="SQL",
        difficulty="easy",
        tags=["SQL", "WHERE"],
        statement="Write a query to find product ids where both low_fats and recyclable are 'Y'.",
        constraints_text="Use the Products table with columns product_id, low_fats, recyclable.",
        input_format="The database is already populated before the query runs.",
        output_format="Print matching product_id values in ascending order.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Products (product_id INT, low_fats TEXT, recyclable TEXT)",
                "INSERT INTO Products VALUES (1, 'Y', 'Y')",
                "INSERT INTO Products VALUES (2, 'Y', 'N')",
                "INSERT INTO Products VALUES (3, 'N', 'Y')",
                "INSERT INTO Products VALUES (4, 'Y', 'Y')"
            ]), "expected_output": "1\n4", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Products (product_id INT, low_fats TEXT, recyclable TEXT)",
                "INSERT INTO Products VALUES (1, 'N', 'N')",
                "INSERT INTO Products VALUES (2, 'Y', 'Y')"
            ]), "expected_output": "2", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Products (product_id INT, low_fats TEXT, recyclable TEXT)",
                "INSERT INTO Products VALUES (1, 'Y', 'N')"
            ]), "expected_output": "", "hidden": True},
        ],
        solution_code="SELECT product_id FROM Products WHERE low_fats = 'Y' AND recyclable = 'Y' ORDER BY product_id;",
    ),
    sql_question(
        title="Second Highest Salary",
        topic="SQL",
        difficulty="medium",
        tags=["SQL", "Subquery"],
        statement="Write a query to report the second highest distinct salary from the Employee table.",
        constraints_text="Use the Employee table with a Salary column.",
        input_format="The database is already populated before the query runs.",
        output_format="Print the value using the alias SecondHighestSalary.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Employee (Id INT, Salary INT)",
                "INSERT INTO Employee VALUES (1, 100)",
                "INSERT INTO Employee VALUES (2, 200)",
                "INSERT INTO Employee VALUES (3, 300)"
            ]), "expected_output": "200", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Employee (Id INT, Salary INT)",
                "INSERT INTO Employee VALUES (1, 100)"
            ]), "expected_output": "NULL", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Employee (Id INT, Salary INT)",
                "INSERT INTO Employee VALUES (1, 100)",
                "INSERT INTO Employee VALUES (2, 100)",
                "INSERT INTO Employee VALUES (3, 50)"
            ]), "expected_output": "50", "hidden": True},
        ],
        solution_code="SELECT MAX(Salary) AS SecondHighestSalary FROM Employee WHERE Salary < (SELECT MAX(Salary) FROM Employee);",
    ),
    sql_question(
        title="Department Highest Salary",
        topic="SQL",
        difficulty="medium",
        tags=["SQL", "JOIN", "Window Function"],
        statement="Write a query to find employees who earn the highest salary in each department.",
        constraints_text="Use Employee(Id, Name, Salary, DepartmentId) and Department(Id, Name).",
        input_format="The database is already populated before the query runs.",
        output_format="Print Department, Employee, Salary in ascending department order.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Department (Id INT, Name TEXT)",
                "CREATE TABLE Employee (Id INT, Name TEXT, Salary INT, DepartmentId INT)",
                "INSERT INTO Department VALUES (1, 'IT')",
                "INSERT INTO Department VALUES (2, 'Sales')",
                "INSERT INTO Employee VALUES (1, 'Joe', 70000, 1)",
                "INSERT INTO Employee VALUES (2, 'Henry', 80000, 2)",
                "INSERT INTO Employee VALUES (3, 'Sam', 60000, 2)",
                "INSERT INTO Employee VALUES (4, 'Max', 90000, 1)"
            ]), "expected_output": "IT|Max|90000\nSales|Henry|80000", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Department (Id INT, Name TEXT)",
                "CREATE TABLE Employee (Id INT, Name TEXT, Salary INT, DepartmentId INT)",
                "INSERT INTO Department VALUES (1, 'A')",
                "INSERT INTO Employee VALUES (1, 'x', 10, 1)",
                "INSERT INTO Employee VALUES (2, 'y', 20, 1)"
            ]), "expected_output": "A|y|20", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Department (Id INT, Name TEXT)",
                "CREATE TABLE Employee (Id INT, Name TEXT, Salary INT, DepartmentId INT)",
                "INSERT INTO Department VALUES (1, 'A')",
                "INSERT INTO Department VALUES (2, 'B')",
                "INSERT INTO Employee VALUES (1, 'x', 10, 1)",
                "INSERT INTO Employee VALUES (2, 'y', 10, 1)",
                "INSERT INTO Employee VALUES (3, 'z', 5, 2)"
            ]), "expected_output": "A|x|10\nA|y|10\nB|z|5", "hidden": True},
        ],
        solution_code="""WITH ranked AS (\n    SELECT e.Name AS Employee, d.Name AS Department, e.Salary,\n           DENSE_RANK() OVER (PARTITION BY e.DepartmentId ORDER BY e.Salary DESC) AS rnk\n    FROM Employee e\n    JOIN Department d ON e.DepartmentId = d.Id\n)\nSELECT Department, Employee, Salary\nFROM ranked\nWHERE rnk = 1\nORDER BY Department, Employee;""",
    ),
    sql_question(
        title="Rank Scores",
        topic="SQL",
        difficulty="hard",
        tags=["SQL", "Window Function"],
        statement="Write a query to rank scores in descending order. Ties should share the same rank.",
        constraints_text="Use the Scores table with column Score.",
        input_format="The database is already populated before the query runs.",
        output_format="Print Score and Rank ordered by Score descending.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Scores (Score INT)",
                "INSERT INTO Scores VALUES (4)",
                "INSERT INTO Scores VALUES (3)",
                "INSERT INTO Scores VALUES (3)",
                "INSERT INTO Scores VALUES (2)",
                "INSERT INTO Scores VALUES (1)"
            ]), "expected_output": "4|1\n3|2\n3|2\n2|3\n1|4", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Scores (Score INT)",
                "INSERT INTO Scores VALUES (100)",
                "INSERT INTO Scores VALUES (90)",
                "INSERT INTO Scores VALUES (90)"
            ]), "expected_output": "100|1\n90|2\n90|2", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Scores (Score INT)",
                "INSERT INTO Scores VALUES (5)",
                "INSERT INTO Scores VALUES (5)",
                "INSERT INTO Scores VALUES (5)"
            ]), "expected_output": "5|1\n5|1\n5|1", "hidden": True},
        ],
        solution_code="SELECT Score, DENSE_RANK() OVER (ORDER BY Score DESC) AS Rank FROM Scores ORDER BY Score DESC;",
    ),
    sql_question(
        title="Trips and Users",
        topic="SQL",
        difficulty="hard",
        tags=["SQL", "Aggregation"],
        statement="Write a query to find the cancellation rate for trips requested by unbanned users from 2013-10-01 to 2013-10-03.",
        constraints_text="Use Trips(TripId, Client_Id, Driver_Id, City, Status, Request_at) and Users(User_Id, Banned, Role).",
        input_format="The database is already populated before the query runs.",
        output_format="Print Request_at and Cancellation Rate with 2 decimal places.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Trips (TripId INT, Client_Id INT, Driver_Id INT, City TEXT, Status TEXT, Request_at TEXT)",
                "CREATE TABLE Users (User_Id INT, Banned TEXT, Role TEXT)",
                "INSERT INTO Users VALUES (1, 'No', 'client')",
                "INSERT INTO Users VALUES (2, 'Yes', 'client')",
                "INSERT INTO Users VALUES (3, 'No', 'client')",
                "INSERT INTO Users VALUES (4, 'No', 'driver')",
                "INSERT INTO Trips VALUES (1, 1, 4, 'NY', 'completed', '2013-10-01')",
                "INSERT INTO Trips VALUES (2, 3, 4, 'NY', 'cancelled_by_driver', '2013-10-01')",
                "INSERT INTO Trips VALUES (3, 1, 4, 'NY', 'completed', '2013-10-02')"
            ]), "expected_output": "2013-10-01|0.50\n2013-10-02|0.00", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Trips (TripId INT, Client_Id INT, Driver_Id INT, City TEXT, Status TEXT, Request_at TEXT)",
                "CREATE TABLE Users (User_Id INT, Banned TEXT, Role TEXT)",
                "INSERT INTO Users VALUES (1, 'No', 'client')",
                "INSERT INTO Users VALUES (2, 'No', 'driver')",
                "INSERT INTO Trips VALUES (1, 1, 2, 'NY', 'cancelled_by_client', '2013-10-03')"
            ]), "expected_output": "2013-10-03|1.00", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Trips (TripId INT, Client_Id INT, Driver_Id INT, City TEXT, Status TEXT, Request_at TEXT)",
                "CREATE TABLE Users (User_Id INT, Banned TEXT, Role TEXT)",
                "INSERT INTO Users VALUES (1, 'No', 'client')",
                "INSERT INTO Users VALUES (2, 'No', 'driver')"
            ]), "expected_output": "", "hidden": True},
        ],
        solution_code="""WITH filtered AS (\n    SELECT t.Request_at, t.Status\n    FROM Trips t\n    JOIN Users c ON t.Client_Id = c.User_Id AND c.Banned = 'No'\n    JOIN Users d ON t.Driver_Id = d.User_Id AND d.Banned = 'No'\n    WHERE t.Request_at BETWEEN '2013-10-01' AND '2013-10-03'\n), summary AS (\n    SELECT Request_at,\n           AVG(CASE WHEN Status LIKE 'cancelled%' THEN 1.0 ELSE 0.0 END) AS rate\n    FROM filtered\n    GROUP BY Request_at\n)\nSELECT Request_at, printf('%.2f', rate) AS 'Cancellation Rate'\nFROM summary\nORDER BY Request_at;""",
    ),
    sql_question(
        title="Combine Two Tables",
        topic="SQL",
        difficulty="easy",
        tags=["SQL", "LEFT JOIN"],
        statement="Write a query to report firstName, lastName, city, and state for each person in the Person table.",
        constraints_text="Use Person(personId, lastName, firstName) and Address(addressId, personId, city, state).",
        input_format="The database is already populated before the query runs.",
        output_format="Print firstName, lastName, city, state ordered by personId.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Person (personId INT, lastName TEXT, firstName TEXT)",
                "CREATE TABLE Address (addressId INT, personId INT, city TEXT, state TEXT)",
                "INSERT INTO Person VALUES (1, 'Wang', 'Allen')",
                "INSERT INTO Person VALUES (2, 'Alice', 'Bob')",
                "INSERT INTO Address VALUES (1, 2, 'New York City', 'New York')"
            ]), "expected_output": "Allen|Wang|NULL|NULL\nBob|Alice|New York City|New York", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Person (personId INT, lastName TEXT, firstName TEXT)",
                "CREATE TABLE Address (addressId INT, personId INT, city TEXT, state TEXT)",
                "INSERT INTO Person VALUES (1, 'Doe', 'John')",
                "INSERT INTO Address VALUES (1, 1, 'Austin', 'Texas')"
            ]), "expected_output": "John|Doe|Austin|Texas", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Person (personId INT, lastName TEXT, firstName TEXT)",
                "CREATE TABLE Address (addressId INT, personId INT, city TEXT, state TEXT)",
                "INSERT INTO Person VALUES (1, 'A', 'X')",
                "INSERT INTO Person VALUES (2, 'B', 'Y')"
            ]), "expected_output": "X|A|NULL|NULL\nY|B|NULL|NULL", "hidden": True},
        ],
        solution_code="SELECT p.firstName, p.lastName, a.city, a.state FROM Person p LEFT JOIN Address a ON p.personId = a.personId ORDER BY p.personId;",
    ),
    sql_question(
        title="Customers Who Never Order",
        topic="SQL",
        difficulty="easy",
        tags=["SQL", "LEFT JOIN"],
        statement="Write a query to find all customers who never place any orders.",
        constraints_text="Use Customers(id, name) and Orders(id, customerId).",
        input_format="The database is already populated before the query runs.",
        output_format="Print customer names using alias Customers ordered alphabetically.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Customers (id INT, name TEXT)",
                "CREATE TABLE Orders (id INT, customerId INT)",
                "INSERT INTO Customers VALUES (1, 'Joe')",
                "INSERT INTO Customers VALUES (2, 'Henry')",
                "INSERT INTO Customers VALUES (3, 'Sam')",
                "INSERT INTO Customers VALUES (4, 'Max')",
                "INSERT INTO Orders VALUES (1, 3)",
                "INSERT INTO Orders VALUES (2, 1)"
            ]), "expected_output": "Henry\nMax", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Customers (id INT, name TEXT)",
                "CREATE TABLE Orders (id INT, customerId INT)",
                "INSERT INTO Customers VALUES (1, 'A')",
                "INSERT INTO Orders VALUES (1, 1)"
            ]), "expected_output": "", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Customers (id INT, name TEXT)",
                "CREATE TABLE Orders (id INT, customerId INT)",
                "INSERT INTO Customers VALUES (1, 'B')",
                "INSERT INTO Customers VALUES (2, 'A')"
            ]), "expected_output": "A\nB", "hidden": True},
        ],
        solution_code="SELECT c.name AS Customers FROM Customers c LEFT JOIN Orders o ON c.id = o.customerId WHERE o.id IS NULL ORDER BY c.name;",
    ),
    sql_question(
        title="Duplicate Emails",
        topic="SQL",
        difficulty="easy",
        tags=["SQL", "GROUP BY"],
        statement="Write a query to report all duplicate emails.",
        constraints_text="Use Person(id, email).",
        input_format="The database is already populated before the query runs.",
        output_format="Print duplicate emails using alias Email in alphabetical order.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Person (id INT, email TEXT)",
                "INSERT INTO Person VALUES (1, 'a@b.com')",
                "INSERT INTO Person VALUES (2, 'c@d.com')",
                "INSERT INTO Person VALUES (3, 'a@b.com')"
            ]), "expected_output": "a@b.com", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Person (id INT, email TEXT)",
                "INSERT INTO Person VALUES (1, 'x@y.com')",
                "INSERT INTO Person VALUES (2, 'x@y.com')",
                "INSERT INTO Person VALUES (3, 'z@y.com')",
                "INSERT INTO Person VALUES (4, 'z@y.com')"
            ]), "expected_output": "x@y.com\nz@y.com", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Person (id INT, email TEXT)",
                "INSERT INTO Person VALUES (1, 'solo@x.com')"
            ]), "expected_output": "", "hidden": True},
        ],
        solution_code="SELECT email AS Email FROM Person GROUP BY email HAVING COUNT(*) > 1 ORDER BY email;",
    ),
    sql_question(
        title="Rising Temperature",
        topic="SQL",
        difficulty="medium",
        tags=["SQL", "SELF JOIN"],
        statement="Write a query to find all dates where the temperature is higher than the previous day.",
        constraints_text="Use Weather(id, recordDate, temperature).",
        input_format="The database is already populated before the query runs.",
        output_format="Print matching Weather ids in ascending order.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Weather (id INT, recordDate TEXT, temperature INT)",
                "INSERT INTO Weather VALUES (1, '2015-01-01', 10)",
                "INSERT INTO Weather VALUES (2, '2015-01-02', 25)",
                "INSERT INTO Weather VALUES (3, '2015-01-03', 20)",
                "INSERT INTO Weather VALUES (4, '2015-01-04', 30)"
            ]), "expected_output": "2\n4", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Weather (id INT, recordDate TEXT, temperature INT)",
                "INSERT INTO Weather VALUES (1, '2020-02-01', 5)",
                "INSERT INTO Weather VALUES (2, '2020-02-02', 5)",
                "INSERT INTO Weather VALUES (3, '2020-02-03', 6)"
            ]), "expected_output": "3", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Weather (id INT, recordDate TEXT, temperature INT)",
                "INSERT INTO Weather VALUES (7, '2021-01-01', 2)"
            ]), "expected_output": "", "hidden": True},
        ],
        solution_code="SELECT w1.id FROM Weather w1 JOIN Weather w2 ON julianday(w1.recordDate) - julianday(w2.recordDate) = 1 WHERE w1.temperature > w2.temperature ORDER BY w1.id;",
    ),
    sql_question(
        title="Big Countries",
        topic="SQL",
        difficulty="easy",
        tags=["SQL", "WHERE"],
        statement="Write a query to find name, population, and area for countries with area >= 3000000 or population >= 25000000.",
        constraints_text="Use World(name, continent, area, population, gdp).",
        input_format="The database is already populated before the query runs.",
        output_format="Print name, population, area ordered by name.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE World (name TEXT, continent TEXT, area INT, population INT, gdp INT)",
                "INSERT INTO World VALUES ('Afghanistan', 'Asia', 652230, 25500100, 20343000000)",
                "INSERT INTO World VALUES ('Albania', 'Europe', 28748, 2831741, 12960000000)",
                "INSERT INTO World VALUES ('Algeria', 'Africa', 2381741, 37100000, 188681000000)"
            ]), "expected_output": "Afghanistan|25500100|652230\nAlgeria|37100000|2381741", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE World (name TEXT, continent TEXT, area INT, population INT, gdp INT)",
                "INSERT INTO World VALUES ('A', 'X', 3000000, 1, 0)",
                "INSERT INTO World VALUES ('B', 'Y', 1, 25000000, 0)",
                "INSERT INTO World VALUES ('C', 'Z', 10, 10, 0)"
            ]), "expected_output": "A|1|3000000\nB|25000000|1", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE World (name TEXT, continent TEXT, area INT, population INT, gdp INT)",
                "INSERT INTO World VALUES ('Small', 'X', 100, 100, 0)"
            ]), "expected_output": "", "hidden": True},
        ],
        solution_code="SELECT name, population, area FROM World WHERE area >= 3000000 OR population >= 25000000 ORDER BY name;",
    ),
    sql_question(
        title="Not Boring Movies",
        topic="SQL",
        difficulty="easy",
        tags=["SQL", "WHERE"],
        statement="Write a query to report movies with odd-numbered id and description not equal to 'boring'.",
        constraints_text="Use Cinema(id, movie, description, rating).",
        input_format="The database is already populated before the query runs.",
        output_format="Print id, movie, description, rating ordered by rating descending.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Cinema (id INT, movie TEXT, description TEXT, rating REAL)",
                "INSERT INTO Cinema VALUES (1, 'War', 'great 3D', 8.9)",
                "INSERT INTO Cinema VALUES (2, 'Science', 'fiction', 8.5)",
                "INSERT INTO Cinema VALUES (3, 'irish', 'boring', 6.2)",
                "INSERT INTO Cinema VALUES (5, 'House card', 'Interesting', 9.1)"
            ]), "expected_output": "5|House card|Interesting|9.1\n1|War|great 3D|8.9", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Cinema (id INT, movie TEXT, description TEXT, rating REAL)",
                "INSERT INTO Cinema VALUES (1, 'A', 'boring', 9.0)",
                "INSERT INTO Cinema VALUES (3, 'B', 'fun', 7.0)"
            ]), "expected_output": "3|B|fun|7.0", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Cinema (id INT, movie TEXT, description TEXT, rating REAL)",
                "INSERT INTO Cinema VALUES (2, 'C', 'good', 5.0)"
            ]), "expected_output": "", "hidden": True},
        ],
        solution_code="SELECT id, movie, description, rating FROM Cinema WHERE id % 2 = 1 AND LOWER(description) != 'boring' ORDER BY rating DESC;",
    ),
    sql_question(
        title="Consecutive Numbers",
        topic="SQL",
        difficulty="medium",
        tags=["SQL", "SELF JOIN"],
        statement="Write a query to find numbers that appear at least three times consecutively.",
        constraints_text="Use Logs(id, num).",
        input_format="The database is already populated before the query runs.",
        output_format="Print distinct numbers using alias ConsecutiveNums in ascending order.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Logs (id INT, num INT)",
                "INSERT INTO Logs VALUES (1, 1)",
                "INSERT INTO Logs VALUES (2, 1)",
                "INSERT INTO Logs VALUES (3, 1)",
                "INSERT INTO Logs VALUES (4, 2)",
                "INSERT INTO Logs VALUES (5, 1)",
                "INSERT INTO Logs VALUES (6, 1)",
                "INSERT INTO Logs VALUES (7, 1)"
            ]), "expected_output": "1", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Logs (id INT, num INT)",
                "INSERT INTO Logs VALUES (1, 2)",
                "INSERT INTO Logs VALUES (2, 2)",
                "INSERT INTO Logs VALUES (3, 2)",
                "INSERT INTO Logs VALUES (4, 3)",
                "INSERT INTO Logs VALUES (5, 3)",
                "INSERT INTO Logs VALUES (6, 3)"
            ]), "expected_output": "2\n3", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Logs (id INT, num INT)",
                "INSERT INTO Logs VALUES (1, 8)",
                "INSERT INTO Logs VALUES (2, 8)"
            ]), "expected_output": "", "hidden": True},
        ],
        solution_code="SELECT DISTINCT l1.num AS ConsecutiveNums FROM Logs l1 JOIN Logs l2 ON l1.id + 1 = l2.id AND l1.num = l2.num JOIN Logs l3 ON l2.id + 1 = l3.id AND l2.num = l3.num ORDER BY ConsecutiveNums;",
    ),
    sql_question(
        title="Game Play Analysis I",
        topic="SQL",
        difficulty="easy",
        tags=["SQL", "Aggregation"],
        statement="Write a query to find each player's first login date.",
        constraints_text="Use Activity(player_id, device_id, event_date, games_played).",
        input_format="The database is already populated before the query runs.",
        output_format="Print player_id and first_login ordered by player_id.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Activity (player_id INT, device_id INT, event_date TEXT, games_played INT)",
                "INSERT INTO Activity VALUES (1, 2, '2016-03-01', 5)",
                "INSERT INTO Activity VALUES (1, 2, '2016-05-02', 6)",
                "INSERT INTO Activity VALUES (2, 3, '2017-06-25', 1)",
                "INSERT INTO Activity VALUES (3, 1, '2016-03-02', 0)",
                "INSERT INTO Activity VALUES (3, 4, '2018-07-03', 5)"
            ]), "expected_output": "1|2016-03-01\n2|2017-06-25\n3|2016-03-02", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Activity (player_id INT, device_id INT, event_date TEXT, games_played INT)",
                "INSERT INTO Activity VALUES (9, 1, '2022-01-05', 2)",
                "INSERT INTO Activity VALUES (9, 1, '2022-01-01', 3)"
            ]), "expected_output": "9|2022-01-01", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Activity (player_id INT, device_id INT, event_date TEXT, games_played INT)",
                "INSERT INTO Activity VALUES (4, 1, '2020-10-10', 0)",
                "INSERT INTO Activity VALUES (5, 1, '2019-01-01', 1)"
            ]), "expected_output": "4|2020-10-10\n5|2019-01-01", "hidden": True},
        ],
        solution_code="SELECT player_id, MIN(event_date) AS first_login FROM Activity GROUP BY player_id ORDER BY player_id;",
    ),
    sql_question(
        title="Customer Placing the Largest Number of Orders",
        topic="SQL",
        difficulty="medium",
        tags=["SQL", "Aggregation"],
        statement="Write a query to find the customer_number that has placed the largest number of orders.",
        constraints_text="Use Orders(order_number, customer_number).",
        input_format="The database is already populated before the query runs.",
        output_format="Print customer_number. If tie, print the smallest customer_number.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Orders (order_number INT, customer_number INT)",
                "INSERT INTO Orders VALUES (1, 1)",
                "INSERT INTO Orders VALUES (2, 2)",
                "INSERT INTO Orders VALUES (3, 3)",
                "INSERT INTO Orders VALUES (4, 3)"
            ]), "expected_output": "3", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Orders (order_number INT, customer_number INT)",
                "INSERT INTO Orders VALUES (1, 4)",
                "INSERT INTO Orders VALUES (2, 4)",
                "INSERT INTO Orders VALUES (3, 2)",
                "INSERT INTO Orders VALUES (4, 2)"
            ]), "expected_output": "2", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Orders (order_number INT, customer_number INT)",
                "INSERT INTO Orders VALUES (1, 8)"
            ]), "expected_output": "8", "hidden": True},
        ],
        solution_code="SELECT customer_number FROM Orders GROUP BY customer_number ORDER BY COUNT(*) DESC, customer_number ASC LIMIT 1;",
    ),
    sql_question(
        title="Find Customer Referee",
        topic="SQL",
        difficulty="easy",
        tags=["SQL", "WHERE"],
        statement="Write a query to find names of customers not referred by the customer with id = 2.",
        constraints_text="Use Customer(id, name, referee_id).",
        input_format="The database is already populated before the query runs.",
        output_format="Print names ordered alphabetically.",
        test_cases=[
            {"input_data": setup_sql([
                "CREATE TABLE Customer (id INT, name TEXT, referee_id INT)",
                "INSERT INTO Customer VALUES (1, 'Will', NULL)",
                "INSERT INTO Customer VALUES (2, 'Jane', NULL)",
                "INSERT INTO Customer VALUES (3, 'Alex', 2)",
                "INSERT INTO Customer VALUES (4, 'Bill', NULL)",
                "INSERT INTO Customer VALUES (5, 'Zack', 1)",
                "INSERT INTO Customer VALUES (6, 'Mark', 2)"
            ]), "expected_output": "Bill\nJane\nWill\nZack", "hidden": False},
            {"input_data": setup_sql([
                "CREATE TABLE Customer (id INT, name TEXT, referee_id INT)",
                "INSERT INTO Customer VALUES (1, 'A', 2)",
                "INSERT INTO Customer VALUES (2, 'B', NULL)"
            ]), "expected_output": "B", "hidden": True},
            {"input_data": setup_sql([
                "CREATE TABLE Customer (id INT, name TEXT, referee_id INT)",
                "INSERT INTO Customer VALUES (1, 'C', NULL)",
                "INSERT INTO Customer VALUES (2, 'D', 3)"
            ]), "expected_output": "C\nD", "hidden": True},
        ],
        solution_code="SELECT name FROM Customer WHERE referee_id != 2 OR referee_id IS NULL ORDER BY name;",
    ),
]
