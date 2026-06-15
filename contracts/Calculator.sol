// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Calculator {
    string private name;
    
    // Struct to store history of calculations
    struct Calculation {
        string operation;
        int256 a;
        int256 b;
        int256 result;
        uint256 timestamp;
    }
    
    Calculation[] private history;
    
    event CalculationPerformed(string operation, int256 a, int256 b, int256 result, uint256 timestamp);
    event NameUpdated(string oldName, string newName);
    
    constructor() {
        name = "DApp Calculator";
    }
    
    // Set user/app name
    function setName(string memory _name) public {
        require(bytes(_name).length > 0, "Name cannot be empty");
        string memory oldName = name;
        name = _name;
        emit NameUpdated(oldName, _name);
    }
    
    // Get user/app name
    function getName() public view returns (string memory) {
        return name;
    }
    
    // Addition
    function add(int256 a, int256 b) public returns (int256) {
        int256 result = a + b;
        history.push(Calculation("Addition", a, b, result, block.timestamp));
        emit CalculationPerformed("Addition", a, b, result, block.timestamp);
        return result;
    }
    
    // Subtraction
    function subtract(int256 a, int256 b) public returns (int256) {
        int256 result = a - b;
        history.push(Calculation("Subtraction", a, b, result, block.timestamp));
        emit CalculationPerformed("Subtraction", a, b, result, block.timestamp);
        return result;
    }
    
    // Multiplication
    function multiply(int256 a, int256 b) public returns (int256) {
        int256 result = a * b;
        history.push(Calculation("Multiplication", a, b, result, block.timestamp));
        emit CalculationPerformed("Multiplication", a, b, result, block.timestamp);
        return result;
    }
    
    // Division
    function divide(int256 a, int256 b) public returns (int256) {
        require(b != 0, "Division by zero is not allowed");
        int256 result = a / b;
        history.push(Calculation("Division", a, b, result, block.timestamp));
        emit CalculationPerformed("Division", a, b, result, block.timestamp);
        return result;
    }
    
    // Get calculation history count
    function getHistoryCount() public view returns (uint256) {
        return history.length;
    }
    
    // Get calculation history item
    function getHistoryItem(uint256 index) public view returns (
        string memory operation,
        int256 a,
        int256 b,
        int256 result,
        uint256 timestamp
    ) {
        require(index < history.length, "Index out of bounds");
        Calculation memory calc = history[index];
        return (calc.operation, calc.a, calc.b, calc.result, calc.timestamp);
    }
}
