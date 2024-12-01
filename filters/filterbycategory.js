export const filterByCategory = (collection, category) => {

	category = category.toLowerCase();

	const filtered = collection.filter(
		item => (item.data.categories && item.data.categories.includes(category))
	);
	return filtered;
};
