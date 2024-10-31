function checkAndRegisterUser(userName, adminPassword) {
  var adminPass = "admin"; // Define a senha de administrador aqui
  if (adminPassword !== adminPass) {
    return { success: false, message: "Incorrect admin password." }; // Retorna uma mensagem de erro se a senha estiver incorreta
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users'); // Obtém a planilha ativa e seleciona a aba 'Users'
  
  // Obtém os valores da coluna A a partir da segunda linha
  var users = sheet.getRange('A2:A').getValues().flat().filter(String); 
  
  // Converte os nomes de usuários para minúsculas para comparação
  var lowerCaseUsers = users.map(function(user) { return user.toLowerCase(); });
  
  // Verifica se o nome do usuário já existe
  if (lowerCaseUsers.includes(userName.toLowerCase())) {
    return { success: false, message: "User already exists." }; // Retorna uma mensagem de erro se o usuário já existir
  } else {
    // Encontra a última linha preenchida da coluna A
    var lastRow = sheet.getRange('A:A').getValues().filter(String).length + 1; // Soma 1 para contar a linha seguinte disponível

    // Insere o novo usuário na próxima linha disponível na coluna A
    sheet.getRange(lastRow, 1).setValue(userName);
    
    return { success: true, message: "User registered successfully." }; // Retorna uma mensagem de sucesso
  }
}

function getUsers() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users'); // Obtém a planilha ativa e seleciona a aba 'Users'
  var users = sheet.getRange('A2:A').getValues().flat().filter(String); // Obtém todos os nomes de usuários da coluna A
  return users; // Retorna a lista de usuários
}

function deleteUser(userName, adminPassword) {
  var adminPass = "admin"; // Define a senha de administrador aqui
  if (adminPassword !== adminPass) {
    return { success: false, message: "Incorrect admin password." }; // Retorna uma mensagem de erro se a senha estiver incorreta
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users'); // Obtém a planilha ativa e seleciona a aba 'Users'
  var range = sheet.getRange('A2:A'); // Obtém o intervalo da coluna A
  var values = range.getValues(); // Obtém os valores do intervalo
  
  for (var i = 0; i < values.length; i++) {
    if (values[i][0].toString().toLowerCase() === userName.toString().toLowerCase()) {
      sheet.deleteRow(i + 2); // Deleta a linha correspondente ao usuário
      return { success: true, message: "User deleted successfully." }; // Retorna uma mensagem de sucesso
    }
  }
  
  return { success: false, message: "User not found." }; // Retorna uma mensagem de erro se o usuário não for encontrado
}

function registerData(action, identifier, identifierType, quantity, machine, name, usage) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Balance'); // Obtém a planilha ativa e seleciona a aba 'Balance'
  var dataHora = new Date(); // Obtém a data e hora atuais
  var week = getWeekNumber(dataHora); // Obtém o número da semana atual

  // Verifica se o código ou localização existe na planilha "List" e obtém a descrição, valor, estoque inicial e departamento
  var result = getPartByCodeOrLocation(identifier, identifierType);
  if (!result) {
    Logger.log('Code or Location not found: ' + identifier); // Loga uma mensagem se o código ou localização não for encontrado
    SpreadsheetApp.getUi().alert('Code or Location not found: ' + identifier); // Exibe um alerta se o código ou localização não for encontrado
    return; // Se o código ou localização não for encontrado, não registra os dados
  }

  var code = result.code; // Obtém o código da peça
  var description = result.description; // Obtém a descrição da peça
  var value = result.value; // Obtém o valor da peça
  var initialStock = result.initialStock; // Obtém o estoque inicial da peça
  var dept = result.dept; // Obtém o departamento
  Logger.log('Code: ' + code); // Loga o código da peça
  Logger.log('Description: ' + description); // Loga a descrição da peça
  Logger.log('Value: ' + value); // Loga o valor da peça
  Logger.log('Initial Stock: ' + initialStock); // Loga o estoque inicial da peça
  Logger.log('Department: ' + dept); // Loga o departamento

  // Garante que a quantidade seja tratada como número
  quantity = parseFloat(quantity);
  
  // Calcula o estoque atualizado antes da operação
  var updatedStock = initialStock;

  if (action === 'output') {
    // Verifica se a subtração deixará o saldo negativo
    if (initialStock - quantity < 0) {
      SpreadsheetApp.getUi().alert('Saldo insuficiente. Saldo atual: ' + initialStock); // Exibe um alerta se o saldo for insuficiente
      return; // Não realiza a operação
    }
    quantity = -Math.abs(quantity); // Garante que a quantidade seja negativa
  }

  // Atualiza o estoque com a quantidade correta
  updatedStock += quantity;


 var totalValue = Math.abs(quantity * value); 
  // Calcula o valor total como a multiplicação da quantidade pelo valor unitário e garante que seja positivo.


  // Registra os dados na planilha "Balance"
  if (action === 'input') {
    sheet.appendRow([code, quantity, machine, name, dataHora, week, description, totalValue, usage, dept, action]);
  } else if (action === 'output') {
    sheet.appendRow([code, quantity, machine, name, dataHora, week, description, totalValue, usage, dept, action]);
  }

  // Atualiza o estoque inicial na planilha "List"
  updateInitialStock(code, updatedStock);

  // Formata a coluna de valor como moeda em dólares
  var lastRow = sheet.getLastRow();
  var range = sheet.getRange(lastRow, 8); // Coluna H (8ª coluna)
  range.setNumberFormat('$#,##0.00');
}




function getPartByCodeOrLocation(identifier, identifierType) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('List'); // Obtém a planilha ativa e seleciona a aba 'List'
  var range = identifierType === 'code' ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1) : sheet.getRange(2, 10, sheet.getLastRow() - 1, 1); // Coluna A para códigos, Coluna J para localizações
  var values = range.getValues().flat().map(function(value) { return value.toString().toLowerCase(); }); // Converte para minúsculas
  var descriptions = sheet.getRange(2, 7, sheet.getLastRow() - 1, 1).getValues().flat(); // Coluna G para descrições
  var identifierLower = identifier.toLowerCase(); // Converte o identificador para minúsculas
  var initialStockColumn = 13; // Coluna M para estoque inicial
  var valueColumn = 12; // Coluna L para valor
  var deptColumn = 3; // Coluna C para departamento

  for (var i = 0; i < values.length; i++) {
    if (values[i] == identifierLower) {
      return {
        code: sheet.getRange(i + 2, 1).getValue(), // Código na coluna A
        location: sheet.getRange(i + 2, 10).getValue(), // Localização na coluna J
        description: descriptions[i], // Descrição na coluna G
        initialStock: sheet.getRange(i + 2, initialStockColumn).getValue(), // Estoque inicial na coluna M
        value: sheet.getRange(i + 2, valueColumn).getValue(), // Valor na coluna L
        dept: sheet.getRange(i + 2, deptColumn).getValue() // Departamento na coluna C
      };
    }
  }
  return null; // Retorna null se não encontrar
}

function verifyCode(code) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('List'); // Obtém a planilha ativa e seleciona a aba 'List'
  var codes = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues(); // Obtém apenas a coluna A a partir da linha 2
  var descriptions = sheet.getRange(2, 7, sheet.getLastRow() - 1, 1).getValues(); // Obtém apenas a coluna G a partir da linha 2
  var values = sheet.getRange(2, 12, sheet.getLastRow() - 1, 1).getValues(); // Obtém apenas a coluna L a partir da linha 2
  var initialStocks = sheet.getRange(2, 13, sheet.getLastRow() - 1, 1).getValues(); // Obtém apenas a coluna M a partir da linha 2
  var depts = sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues(); // Obtém apenas a coluna C a partir da linha 2 (departamento)
  Logger.log('Code Data: ' + JSON.stringify(codes)); // Loga os dados dos códigos
  Logger.log('Description Data: ' + JSON.stringify(descriptions)); // Loga os dados das descrições
  Logger.log('Value Data: ' + JSON.stringify(values)); // Loga os dados dos valores
  Logger.log('Initial Stock Data: ' + JSON.stringify(initialStocks)); // Loga os dados dos estoques iniciais
  Logger.log('Department Data: ' + JSON.stringify(depts)); // Loga os dados dos departamentos
  for (var i = 0; i < codes.length; i++) {
    Logger.log('Comparing ' + codes[i][0] + ' with ' + code); // Compara os códigos
    if (codes[i][0].toString().trim() === code.toString().trim()) {
      Logger.log('Code found: ' + code); // Loga se o código for encontrado
      return { valid: true, description: descriptions[i][0].toString(), value: values[i][0].toString(), initialStock: parseFloat(initialStocks[i][0]), dept: depts[i][0].toString() }; // Retorna a descrição, valor, estoque inicial e departamento como texto
    }
  }
  return { valid: false, description: '', value: '', initialStock: 0, dept: '' }; // Retorna que o código não foi encontrado
}

function updateInitialStock(code, updatedStock) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('List'); // Obtém a planilha ativa e seleciona a aba 'List'
  var codes = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues(); // Obtém apenas a coluna A a partir da linha 2
  for (var i = 0; i < codes.length; i++) {
    if (codes[i][0].toString().trim() === code.toString().trim()) {
      sheet.getRange(i + 2, 13).setValue(updatedStock); // Atualiza a coluna M (estoque inicial)
      break;
    }
  }
}

function registerNewPart(critical, dept, machine, supplier, manufacturer, description, mfrPartNo, sprPartNo, location, idealStock, unitCost, initialBalance, minStock) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('List'); // Obtém a planilha ativa e seleciona a aba 'List'
  var lastRow = sheet.getRange('A:A').getValues().filter(String).length; // Obtém a última linha com dados na coluna A
  Logger.log('Last Row: ' + lastRow); // Loga a última linha com dados
  var newCode = lastRow + 1; // Gera o próximo código na sequência baseado na última linha com dados na coluna A
  Logger.log('New Code: ' + newCode); // Loga o novo código

  // Adiciona os dados à próxima linha disponível
  sheet.getRange(lastRow + 1, 1, 1, 14).setValues([[newCode, critical, dept, machine, supplier, manufacturer, description, mfrPartNo, sprPartNo, location, idealStock, unitCost, initialBalance, minStock]]);
  Logger.log('Data added to List: ' + [newCode, critical, dept, machine, supplier, manufacturer, description, mfrPartNo, sprPartNo, location, idealStock, unitCost, initialBalance, minStock]); // Loga os dados adicionados

  // Formata o custo unitário como moeda em dólares
  var range = sheet.getRange(lastRow + 1, 12); // Coluna L (12ª coluna)
  range.setNumberFormat('$#,##0.00');
}

function getUsageOptions() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users'); // Obtém a planilha ativa e seleciona a aba 'Users'
  var usageOptions = sheet.getRange('D2:D').getValues().flat().filter(String); // Obtém todos os valores da coluna D
  return usageOptions; // Retorna as opções de uso
}

function registerMachine(machineName, machineType, adminPassword) {
  var adminPass = "admin"; // Define a senha do administrador aqui
  if (adminPassword !== adminPass) {
    return { success: false, message: "Incorrect admin password." }; // Retorna uma mensagem de erro se a senha estiver incorreta
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users'); // Obtém a planilha ativa e seleciona a aba 'Users'
  var column = machineType === 'maintenance' ? 2 : (machineType === 'toolroom' ? 3 : null); // Coluna B para manutenção, C para ferramentaria
  if (column === null) {
    return { success: false, message: "Invalid machine type." }; // Verifica se o tipo de máquina é válido
  }

  Logger.log('Selected column: ' + column); // Adiciona log para depuração

  var range = sheet.getRange(2, column, sheet.getLastRow() - 1, 1); // Obtém o intervalo da coluna correta
  var machines = range.getValues().flat().filter(String); // Obtém os valores da coluna
  var lowerCaseMachines = machines.map(function(machine) { return machine.toLowerCase(); }); // Converte os nomes das máquinas para minúsculas

  if (lowerCaseMachines.includes(machineName.toLowerCase())) {
    return { success: false, message: "Machine already exists." }; // Retorna uma mensagem de erro se a máquina já existir
  } else {
    var nextRow = machines.length + 2; // Próxima linha disponível na coluna correta
    sheet.getRange(nextRow, column).setValue(machineName); // Adiciona a máquina na próxima linha disponível na coluna correta
    Logger.log('Machine added at row: ' + nextRow); // Adiciona log para depuração
    return { success: true, message: "Machine registered successfully." }; // Retorna uma mensagem de sucesso
  }
}

function getMachinesByDepartment(department) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users'); // Obtém a planilha ativa e seleciona a aba 'Users'
  var column = department === 'MAINTENANCE' ? 2 : (department === 'TOOLROOM' ? 3 : null); // Coluna B para manutenção, C para ferramentaria
var machines = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).getValues().flat().filter(String); // Obtém os valores da coluna correspondente e filtra valores não vazios
  return machines; // Retorna a lista de máquinas
}

function getDepartments() {
  return ['MAINTENANCE', 'TOOLROOM']; // Retorna uma lista com os departamentos 'MAINTENANCE' e 'TOOLROOM'
}

function getWeekNumber(d) {
  var oneJan = new Date(d.getFullYear(), 0, 1); // Cria uma data para o primeiro dia do ano
  var numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000)); // Calcula o número de dias desde o primeiro dia do ano
  return Math.ceil((d.getDay() + 1 + numberOfDays) / 7); // Calcula o número da semana e retorna
}





function checkEmailExists(department, email) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Emails"); // Obtém a planilha ativa e seleciona a aba 'Emails'
    const data = sheet.getDataRange().getValues(); // Obtém todos os dados da planilha
    for (let i = 1; i < data.length; i++) { // Itera sobre as linhas da planilha, começando da segunda linha
        if (data[i][0] === department && data[i][1] === email) { // Verifica se o departamento e o email correspondem
            return true; // Retorna true se o email já existir no departamento
        }
    }
    return false; // Retorna false se o email não for encontrado
}

function addEmail(department, email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Emails'); // Obtém a planilha ativa e seleciona a aba 'Emails'
  const lastRow = sheet.getLastRow(); // Obtém a última linha preenchida na planilha
  
  // Adiciona o departamento e o email na próxima linha disponível
  sheet.getRange(lastRow + 1, 1).setValue(department); // Define o valor na coluna A (departamento)
  sheet.getRange(lastRow + 1, 2).setValue(email); // Define o valor na coluna B (email)
}

function removeEmail(department, email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Emails'); // Obtém a planilha ativa e seleciona a aba 'Emails'
  const data = sheet.getDataRange().getValues(); // Obtém todos os dados da planilha
  
  // Procura o email a ser removido na coluna B (segunda coluna)
  for (let i = 0; i < data.length; i++) {
    if (data[i][1] === email && data[i][0] === department) { // Verifica se o departamento e o email correspondem
      sheet.deleteRow(i + 1); // Deleta a linha correspondente
      break; // Sai do loop após remover o email
    }
  }
}


function getEmails(department) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Emails'); // Obtém a planilha ativa e seleciona a aba 'Emails'
  const data = sheet.getDataRange().getValues(); // Obtém todos os dados da planilha
  const emails = []; // Inicializa um array vazio para armazenar os emails
  
  // Busca todos os emails correspondentes ao departamento
  data.forEach(row => {
    if (row[0] === department) { // Verifica se o departamento corresponde
      emails.push([row[0], row[1]]); // Adiciona o departamento e o email ao array
    }
  });

  return emails; // Retorna a lista de emails
}

function sendAutomaticReports() {
  const departments = ['maintenance', 'toolroom']; // Define os departamentos para os quais os relatórios serão enviados
  
  departments.forEach(department => {
    const result = sendLowStockReport(department); // Envia o relatório de estoque baixo para o departamento
    Logger.log(`Report for ${department}: ${result}`); // Loga o resultado do envio do relatório
  });
}

function sendAutomaticWeeklyCostReports() {
  const departments = ['maintenance', 'toolroom']; // Define os departamentos para os quais os relatórios serão enviados
  
  departments.forEach(department => {
    const result = sendWeeklyCostReport(department); // Envia o relatório de custo semanal para o departamento
    Logger.log(`Weekly cost report for ${department}: ${result}`); // Loga o resultado do envio do relatório
  });
}







function sendLowStockReport(department) {
  // Garante que department seja uma string e remove espaços extras
  department = String(department).trim().toLowerCase();
  
  Logger.log('Department parameter at start: ' + department); // Loga o parâmetro do departamento no início
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('List'); // Obtém a planilha ativa e seleciona a aba 'List'
  const emailSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Emails'); // Obtém a planilha ativa e seleciona a aba 'Emails'
  const data = sheet.getDataRange().getValues(); // Obtém todos os dados da planilha 'List'

  const reportData = {}; // Objeto para armazenar dados do relatório agrupados por fornecedor
  const columnsToInclude = [0, 2, 4, 5, 6, 7, 8, 10, 11, 12]; // Índices das colunas a serem incluídas no relatório (A, C, E, F, G, H, I, K, L, M)
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const stockStatus = String(row[17]).trim().toUpperCase(); // Obtém o status do estoque na coluna R (índice 17) e converte para maiúsculas
    const rowDepartment = String(row[2]).trim().toLowerCase(); // Obtém o departamento na coluna C (índice 2) e converte para minúsculas
    const supplier = String(row[4]).trim(); // Obtém o fornecedor na coluna E (índice 4)

    // Inclui a linha se o estoque está abaixo do mínimo e o departamento coincide
    if (stockStatus === 'BUY' && rowDepartment === department) {
      // Se o fornecedor ainda não estiver no objeto, inicializa um array
      if (!reportData[supplier]) {
        reportData[supplier] = [columnsToInclude.map(index => data[0][index])]; // Adiciona cabeçalho
      }
      // Formata coluna L (índice 8) como moeda em dólar
      const selectedRow = columnsToInclude.map((index, colIndex) => {
        if (colIndex === 8) {
          return `$${parseFloat(row[index]).toFixed(2)}`;
        }
        return row[index];
      });
      reportData[supplier].push(selectedRow); // Adiciona a linha ao array do fornecedor
    }
  }

  // Verifica se há dados no relatório
  if (Object.keys(reportData).length > 0) {
    let html = `
      <html>
        <head>
          <style>
            @page { size: A4 landscape; margin: 5mm; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid black; padding: 4px; text-align: left; word-wrap: break-word; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>`;

    // Itera sobre cada fornecedor e cria uma tabela
    for (const supplier in reportData) {
      html += `<h1>${department.charAt(0).toUpperCase() + department.slice(1)} Low Stock Report for ${supplier}</h1>`;
      html += `<table>
                <tr>` + reportData[supplier][0].map(cell => `<th>${cell}</th>`).join('') + `</tr>`;
      
      reportData[supplier].slice(1).forEach(row => {
        html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
      });
      html += '</table><br/>'; // Adiciona um espaço entre as tabelas
    }
    
    html += '</body></html>'; // Fecha o corpo do HTML

    const pdfBlob = Utilities.newBlob(html, 'text/html', `${department}_Low_Stock_Report.html`).getAs('application/pdf'); // Converte o HTML para um blob PDF

    const emailData = emailSheet.getRange('A2:B').getValues(); // Obtém os dados de emails da planilha
    const maintenanceEmails = []; // Inicializa um array para emails de manutenção
    const toolroomEmails = []; // Inicializa um array para emails de ferramentaria

    emailData.forEach(row => {
      if (String(row[0]).trim().toLowerCase() === 'maintenance') maintenanceEmails.push(row[1]);
      if (String(row[0]).trim().toLowerCase() === 'toolroom') toolroomEmails.push(row[1]);
    });

    let emailInput = [];
    if (department === 'maintenance') {
      emailInput = maintenanceEmails;
    } else if (department === 'toolroom') {
      emailInput = toolroomEmails;
    }

    const subject = `${department.charAt(0).toUpperCase() + department.slice(1)} Low Stock Report`;
    const emailBody = `Please find attached the low stock report for ${department.charAt(0).toUpperCase() + department.slice(1)}.`;

    if (emailInput.length > 0) {
      MailApp.sendEmail({
        to: emailInput.join(', '),
        subject: subject,
        body: emailBody,
        attachments: [pdfBlob]
      });
      
      Logger.log(`${department.charAt(0).toUpperCase() + department.slice(1)} report sent successfully to ${emailInput.join(', ')}.`);
      return `${department.charAt(0).toUpperCase() + department.slice(1)} report sent successfully to ${emailInput.join(', ')}.`;
    } else {
      Logger.log(`No emails found for the ${department.charAt(0).toUpperCase() + department.slice(1)} department.`);
      return `No emails found for the ${department.charAt(0).toUpperCase() + department.slice(1)} department.`;
    }
  } else {
    Logger.log(`No items below minimum stock for ${department.charAt(0).toUpperCase() + department.slice(1)} to report.`);
    return `No items below minimum stock for ${department.charAt(0).toUpperCase() + department.slice(1)} to report.`;
  }
}











// Função para enviar o relatório de custo semanal para um departamento específico
function sendWeeklyCostReport(department) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Balance'); 
  const emailSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Emails');
  const data = sheet.getDataRange().getValues(); 

  const reportData = [];
  const columnsToInclude = [0, 1, 2, 3, 4, 6, 7, 8]; // Índices das colunas a serem incluídas (A, B, C, D, E, G, H, I)
  
  reportData.push(['No.'].concat(columnsToInclude.map(index => data[0][index])));

  let totalCost = 0;
  const currentWeek = parseInt(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'w')); // Obtém a semana atual

  // Dicionários para armazenar custos por máquina e por razão
  const costByMachineData = {};
  const costByReasonData = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDepartment = String(row[9]).trim().toLowerCase();
    const action = String(row[10]).trim().toLowerCase();
    const week = parseInt(row[5]); 
    const cost = parseFloat(row[7]); 

    if (action === 'output' && rowDepartment === department && week === currentWeek) {
      totalCost += cost;
      const selectedRow = columnsToInclude.map((index) => row[index]);
      selectedRow[6] = `$${cost.toFixed(2)}`; // Formata a coluna de custo (coluna H) como moeda

      // Preencher o relatório com os dados selecionados
      reportData.push([reportData.length].concat(selectedRow));

      // Agrupamento de custos por máquina
      const machineName = row[2]; // Coluna C
      costByMachineData[machineName] = (costByMachineData[machineName] || 0) + cost;

      // Agrupamento de custos por razão
      const reason = row[8]; // Coluna I
      costByReasonData[reason] = (costByReasonData[reason] || 0) + cost;
    }
  }

  if (reportData.length > 1) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const chartSheet1 = getOrCreateSheet(ss, 'Cost by Machine');
    const chartSheet2 = getOrCreateSheet(ss, 'Cost by Reason');

    // Limpa gráficos antigos
    clearCharts(chartSheet1);
    clearCharts(chartSheet2);

    // Criação do relatório de custo por máquina
    const costByMachineReport = [['Machine', 'Total Cost']];
    for (const [machine, total] of Object.entries(costByMachineData)) {
      costByMachineReport.push([machine, total]); // Mantenha o valor como numérico para aplicar a formatação de moeda
    }
    chartSheet1.getRange(1, 1, costByMachineReport.length, 2).setValues(costByMachineReport);

    // Formatação da coluna B como moeda
    chartSheet1.getRange(2, 2, costByMachineReport.length - 1, 1).setNumberFormat('$#,##0.00'); // Formato de moeda

    // Gráfico para custo por máquina
    const machineChart = chartSheet1.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(chartSheet1.getRange('A2:B' + costByMachineReport.length))
      .setPosition(5, 5, 0, 0)
      .setOption('width', 800) // Aumenta a largura do gráfico
      .setOption('height', 500) // Aumenta a altura do gráfico
      .setOption('title', 'Cost by Machine')
      .setOption('hAxis', { title: 'Machine' })
      .setOption('vAxis', { title: 'Cost' })
      .setOption('annotations', { 
        alwaysOutside: true, 
        textStyle: { color: '#000', fontSize: 12 } 
      })
      .build();
    chartSheet1.insertChart(machineChart);

    // Criação do relatório de custo por razão
    const costByReasonReport = [['Reason', 'Total Cost']];
    for (const [reason, total] of Object.entries(costByReasonData)) {
      costByReasonReport.push([reason, total]); // Mantenha o valor como numérico para aplicar a formatação de moeda
    }
    chartSheet2.getRange(1, 1, costByReasonReport.length, 2).setValues(costByReasonReport);

    // Formatação da coluna B como moeda
    chartSheet2.getRange(2, 2, costByReasonReport.length - 1, 1).setNumberFormat('$#,##0.00'); // Formato de moeda

    // Gráfico para custo por razão
    const reasonChart = chartSheet2.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(chartSheet2.getRange('A2:B' + costByReasonReport.length))
      .setPosition(5, 5, 0, 0)
      .setOption('width', 800) // Aumenta a largura do gráfico
      .setOption('height', 500) // Aumenta a altura do gráfico
      .setOption('title', 'Cost by Reason')
      .setOption('hAxis', { title: 'Reason' })
      .setOption('vAxis', { title: 'Cost' })
      .setOption('annotations', { 
        alwaysOutside: true, 
        textStyle: { color: '#000', fontSize: 12 } 
      })
      .build();
    chartSheet2.insertChart(reasonChart);

    // Geração do HTML com gráficos em páginas separadas
    let html = `
      <html>
        <head>
          <style>
            @page { size: A4 landscape; margin: 5mm; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid black; padding: 4px; text-align: left; word-wrap: break-word; }
            th { background-color: #f2f2f2; }
            .chart-container { page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <h1>${department.charAt(0).toUpperCase() + department.slice(1)} Weekly Cost Report - Week ${currentWeek}</h1>
          <h2>Total Cost: $${totalCost.toFixed(2)}</h2>
          <table>
            <tr>` + reportData[0].map(cell => `<th>${cell}</th>`).join('') + `</tr>`;

    reportData.slice(1).forEach(row => {
      html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
    });
    html += `
          </table>
          <div class="chart-container" style="page-break-after: always;">
            <h2>Cost by Machine</h2>
            <div style="text-align: center;">
              <img src="data:image/png;base64,${Utilities.base64Encode(machineChart.getAs('image/png').getBytes())}" alt="Cost by Machine Chart" style="width: 800px; height: 500px;">
            </div>
          </div>
          <div class="chart-container" style="page-break-after: always;">
            <h2>Cost by Reason</h2>
            <div style="text-align: center;">
              <img src="data:image/png;base64,${Utilities.base64Encode(reasonChart.getAs('image/png').getBytes())}" alt="Cost by Reason Chart" style="width: 800px; height: 500px;">
            </div>
          </div>
        </body>
      </html>`;

    const pdfBlob = Utilities.newBlob(html, 'text/html', `${department}_Weekly_Cost_Report_Week_${currentWeek}.html`).getAs('application/pdf');

    const emailData = emailSheet.getRange('A2:B').getValues();
    const departmentEmails = emailData
      .filter(row => String(row[0]).trim().toLowerCase() === department)
      .map(row => row[1]);

    const subject = `${department.charAt(0).toUpperCase() + department.slice(1)} Weekly Cost Report - Week ${currentWeek}`;
    const emailBody = `Please find attached the weekly cost report for ${department.charAt(0).toUpperCase() + department.slice(1)} for week ${currentWeek}, with a total cost of $${totalCost.toFixed(2)}.`;

    if (departmentEmails.length > 0) {
      MailApp.sendEmail({
        to: departmentEmails.join(', '),
        subject: subject,
        body: emailBody,
        attachments: [pdfBlob]
      });

      Logger.log(`Weekly cost report for ${department} sent successfully to: ${departmentEmails.join(', ')}.`);
      return `Weekly cost report for ${department} sent successfully to: ${departmentEmails.join(', ')}.`;
    } else {
      Logger.log(`No emails found for the ${department} department.`);
      return `No emails found for the ${department} department.`;
    }
  } else {
    Logger.log(`No output actions found for ${department} in the current week.`);
    return `No output actions found for ${department} in the current week.`;
  }
}

// Função auxiliar para obter ou criar uma aba
function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear(); // Limpa a aba existente
  }
  return sheet;
}

// Função auxiliar para limpar gráficos de uma aba
function clearCharts(sheet) {
  const charts = sheet.getCharts();
  charts.forEach(chart => sheet.removeChart(chart));
}













function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('WareHouse') // Cria um menu personalizado chamado 'WareHouse'
      .addItem('Menu', 'openInterface')
      .addItem('Update Stock', 'openUpdateStockForm') // Adiciona um item de menu para atualizar o estoque, que chama a função 'openUpdateStockForm'
      .addItem('Register New Part', 'openRegisterPartDialog') // Adiciona um item de menu para registrar uma nova peça, que chama a função 'openRegisterPartDialog'
      .addItem('Register User', 'openRegisterUserDialog') // Adiciona um item de menu para registrar um novo usuário, que chama a função 'openRegisterUserDialog'
      .addItem('Register Machine', 'openRegisterMachineDialog') // Adiciona um item de menu para registrar uma nova máquina, que chama a função 'openRegisterMachineDialog'
      .addItem('Report Generator', 'openReportForm') // Adiciona um item de menu para gerar relatórios, que chama a função 'openReportForm'
      .addToUi(); // Adiciona o menu personalizado à interface do usuário
}

function openInterface() {
  var html = HtmlService.createHtmlOutputFromFile('MainInterface') // Cria uma saída HTML a partir do arquivo 'MainInterface'
      .setWidth(600) // Define a largura da janela para 600 pixels
      .setHeight(600); // Define a altura da janela para 600 pixels
  SpreadsheetApp.getUi().showModalDialog(html, 'Inventory Control'); // Exibe um diálogo modal com o título 'Inventory Control'
}


function openForm(formName) {
  // Declara uma função chamada openForm que aceita um parâmetro formName.
  var html;
  // Declara uma variável chamada html.
  if (formName === 'registerPart') {
    // Verifica se o valor de formName é 'registerPart'.
    html = HtmlService.createHtmlOutputFromFile('RegisterPartForm')
        .setWidth(600)
        .setHeight(600);
    // Se for, cria uma saída HTML a partir do arquivo 'RegisterPartForm' e define a largura e altura para 600.
  } else if (formName === 'updateStock') {
    // Verifica se o valor de formName é 'updateStock'.
    html = HtmlService.createHtmlOutputFromFile('UpdateStockForm')
        .setWidth(600)
        .setHeight(600);
    // Se for, cria uma saída HTML a partir do arquivo 'UpdateStockForm' e define a largura e altura para 600.
  } else if (formName === 'registerUser') {
    // Verifica se o valor de formName é 'registerUser'.
    html = HtmlService.createHtmlOutputFromFile('RegisterUserForm')
        .setWidth(600)
        .setHeight(600);
    // Se for, cria uma saída HTML a partir do arquivo 'RegisterUserForm' e define a largura e altura para 600.
  } else if (formName === 'registerMachine') {
    // Verifica se o valor de formName é 'registerMachine'.
    html = HtmlService.createHtmlOutputFromFile('RegisterMachineForm')
        .setWidth(600)
        .setHeight(600);
    // Se for, cria uma saída HTML a partir do arquivo 'RegisterMachineForm' e define a largura e altura para 600.
  } else if (formName === 'Reports') {
    // Verifica se o valor de formName é 'Reports'.
    html = HtmlService.createHtmlOutputFromFile('ReportForm')
        .setWidth(600)
        .setHeight(600);
    // Se for, cria uma saída HTML a partir do arquivo 'ReportForm' e define a largura e altura para 600.
  }
  SpreadsheetApp.getUi().showModalDialog(html, formName.replace(/([A-Z])/g, ' $1').trim());
  // Mostra um diálogo modal com o HTML gerado e um título formatado a partir do formName.
}



function openRegisterUserDialog() {
  // Declara uma função chamada openRegisterUserDialog.
  var html = HtmlService.createHtmlOutputFromFile('RegisterUserForm')
      .setWidth(600)
      .setHeight(600);
  // Cria uma saída HTML a partir do arquivo 'RegisterUserForm' e define a largura e altura para 600.
  SpreadsheetApp.getUi().showModalDialog(html, 'Register New User');
  // Mostra um diálogo modal com o HTML gerado e o título 'Register New User'.
}

function openRegisterPartDialog() {
  // Declara uma função chamada openRegisterPartDialog.
  var html = HtmlService.createHtmlOutputFromFile('RegisterPartForm')
      .setWidth(600)
      .setHeight(600);
  // Cria uma saída HTML a partir do arquivo 'RegisterPartForm' e define a largura e altura para 600.
  SpreadsheetApp.getUi().showModalDialog(html, 'Register New Part');
  // Mostra um diálogo modal com o HTML gerado e o título 'Register New Part'.
}

function openUpdateStockForm() {
  // Declara uma função chamada openUpdateStockForm.
  var html = HtmlService.createHtmlOutputFromFile('UpdateStockForm')
      .setWidth(600)
      .setHeight(600);
  // Cria uma saída HTML a partir do arquivo 'UpdateStockForm' e define a largura e altura para 600.
  SpreadsheetApp.getUi().showModalDialog(html, 'Stock Update');
  // Mostra um diálogo modal com o HTML gerado e o título 'Stock Update'.
}

function openRegisterMachineDialog() {
  // Declara uma função chamada openRegisterMachineDialog.
  var html = HtmlService.createHtmlOutputFromFile('RegisterMachineForm')
      .setWidth(600)
      .setHeight(600);
  // Cria uma saída HTML a partir do arquivo 'RegisterMachineForm' e define a largura e altura para 600.
  SpreadsheetApp.getUi().showModalDialog(html, 'Register New Machine');
  // Mostra um diálogo modal com o HTML gerado e o título 'Register New Machine'.
}

function openReportForm() {
  // Declara uma função chamada openReportForm.
  var html = HtmlService.createHtmlOutputFromFile('ReportForm')
      .setWidth(600)
      .setHeight(600);
  // Cria uma saída HTML a partir do arquivo 'ReportForm' e define a largura e altura para 600.
  SpreadsheetApp.getUi().showModalDialog(html, 'Create Report');
  // Mostra um diálogo modal com o HTML gerado e o título 'Create Report'.
}

