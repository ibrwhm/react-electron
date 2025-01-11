import React from 'react';

const StatCard = ({ title, children }) => {
    return (
        <div className="bg-dark-800 rounded-lg p-4">
            {title && (
                <h3 className="text-lg font-medium text-white mb-4 border-b border-dark-700 pb-2">
                    {title}
                </h3>
            )}
            <div>{children}</div>
        </div>
    );
};

export default StatCard;
