export default {
	async fetch(request: { method: string; json: () => any }, env: any, ctx: any) {
		// 只处理 POST 请求，你可以根据需要修改
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed: Please use POST', {
				status: 405,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		try {
			// 1. 读取请求体（比如前端传来的 prompt）
			const requestBody = await request.json();
			const userPrompt = requestBody.prompt; // 假设前端传了 { prompt: "你好" }

			if (!userPrompt) {
				return new Response(JSON.stringify({ error: 'Missing prompt' }), {
					status: 400,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				});
			}

			// 2. 调用 OpenAI API
			const openaiApiKey = `sk-f11b2c3813bf4e168c21a5cd6289eb27`; // ⚠️ 请替换成你自己的 API Key
			const openaiApiUrl = 'https://api.deepseek.com/v1/chat/completions';

			const response = await fetch(openaiApiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${openaiApiKey}`,
				},
				body: JSON.stringify({
					model: 'deepseek-chat',
					temperature: requestBody.temperature || 0.7,
					stream: requestBody.stream || false,
					messages: [
						{ role: 'system', content: '你是一个有帮助的 AI 助手。' },
						{ role: 'user', content: userPrompt },
					],
					max_tokens: 1000,
				}),
			});

			console.log('[OpenAI Response Status]', response.status);
			const data = await response.json();
			console.log('[OpenAI Response Body]', data);

			// 3. 将 OpenAI 的响应返回给客户端
			if (!response.ok) {
				// OpenAI 返回了错误，比如无效 key、超出限额等
				return new Response(
					JSON.stringify({
						error: 'OpenAI API Error',
						details: data,
					}),
					{
						status: response.status,
						headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
					}
				);
			}

			return new Response(JSON.stringify(data), {
				status: 200,
				headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
			});
		} catch (error: any) {
			console.error('Worker Error:', error);
			return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
			});
		}
	},
};
