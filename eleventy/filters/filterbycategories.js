export const filterByCategories = (collection, categories) => {

	const normalizedCategories = categories.map(cat => cat.toLowerCase());

	const filtered = collection.filter(
		item => {
			if (!item.data.categories) return false;

			return normalizedCategories.some(category =>
				item.data.categories.includes(category)
			);
		}
	);
	return filtered;
};
