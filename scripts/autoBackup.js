require('shelljs/global');
var path = require('path')
try {
	hexo.on('deployAfter', function() {//当deploy完成后执行备份
		run();
	});
} catch (e) {
	console.log("产生了一个错误<(￣3￣)> !，错误详情为：" + e.toString());
}
function run()
{
	if (!which('git')) {
		echo('请先安装GIT');
		exit(1);
	} else {
		echo("======================Auto Backup Begin===========================");
		cd(path.resolve(__dirname, '..'));
		if (exec('git add .').code !== 0) {
			echo('Error: git add .');
			exit(1);
		}
		exec('git commit -m "'+Date()+'"');
		exec('git pull origin code');
		exec('git push origin code');
		echo("==================Auto Backup Complete============================")
	}
}