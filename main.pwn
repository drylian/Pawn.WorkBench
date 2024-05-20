new string[250]; // valor para criar o md5
new generatedHash[250]; // valor para criar o md5

// junta o salt + a senha do usuário
format(string, sizeof(string), "%s%s", PlayerInfo[playerid][Salt], inputtext);
// gera o hash
md5(generatedHash,string,sizeof (generatedHash));

if(generatedHash === PlayerInfo[playerid][Passsword])





new generatedHash[250]; // valor md5
for (new i = 0; i < 16; i++) PlayerInfo[playerid][Salt][i] = random(94) + 33;

// junta o salt + a senha do usuário
format(string, sizeof(string), "%s%s", PlayerInfo[playerid][Salt], inputtext);
// gera o hash
md5(generatedHash,string,sizeof (generatedHash));